import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  STOREFRONT_CATEGORIES_BLUEPRINT,
} from '../lib/defaults';
import { CATALOG_SEED_PRODUCTS } from '../lib/catalogSeed';
import {
  getCouponByCode,
  getShippingSettings,
  getStorefrontSettings,
  subscribeActiveCategories,
  subscribePublishedProducts,
} from '../lib/firestoreService';
import type {
  CartItem,
  Category,
  Coupon,
  Product,
  ProductVariant,
  ShippingSettings,
  StorefrontSettings,
} from '../types/petclick';

interface StoreContextValue {
  currentPath: string;
  navigate: (to: string) => void;
  products: Product[];
  productsLoading: boolean;
  categories: Category[];
  settings: StorefrontSettings;
  shippingSettings: ShippingSettings;
  cart: CartItem[];
  cartCount: number;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  appliedCoupon: Coupon | null;
  couponError: string | null;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  applyCouponCode: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  refreshSettings: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'petclick_cart_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname + window.location.search);
  const [products, setProducts] = useState<Product[]>(CATALOG_SEED_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>(
    STOREFRONT_CATEGORIES_BLUEPRINT.map((c) => ({ ...c }))
  );
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_STOREFRONT_SETTINGS);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to: string) => {
    if (to !== currentPath) {
      window.history.pushState({}, '', to);
      setCurrentPath(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const refreshSettings = async () => {
    try {
      const [st, sh] = await Promise.all([getStorefrontSettings(), getShippingSettings()]);
      setSettings(st);
      setShippingSettings(sh);
    } catch {
      // Fallback to defaults if rules/offline
    }
  };

  useEffect(() => {
    void refreshSettings();

    const unsubProducts = subscribePublishedProducts(
      (rows) => {
        if (rows.length >= 70) {
          setProducts(rows);
        } else if (rows.length > 0) {
          const byId = new Map<string, Product>(CATALOG_SEED_PRODUCTS.map((p) => [p.id, p]));
          rows.forEach((r) => byId.set(r.id, r));
          setProducts(
            Array.from(byId.values()).sort((a, b) =>
              (a.sku || '').localeCompare(b.sku || '', 'pt-BR', { numeric: true })
            )
          );
        }
        setProductsLoading(false);
      },
      () => {
        setProductsLoading(false);
      }
    );

    const unsubCategories = subscribeActiveCategories(
      (rows) => {
        if (rows.length >= STOREFRONT_CATEGORIES_BLUEPRINT.length) {
          setCategories(rows);
        } else if (rows.length > 0) {
          const byId = new Map<string, Category>(
            STOREFRONT_CATEGORIES_BLUEPRINT.map((c) => [c.id, { ...c }])
          );
          rows.forEach((r) => byId.set(r.id, r));
          setCategories(
            Array.from(byId.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          );
        }
      },
      () => {
        // Keep blueprint categories as structural navigation if collection empty
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const addToCart = (product: Product, quantity = 1, variant?: ProductVariant) => {
    const maxAvail = variant
      ? Math.max(0, (variant.stockOwn || 0) + (variant.stockSupplier || 0))
      : Math.max(0, (product.stockOwn || 0) + (product.stockSupplier || 0));

    if (!product.available || maxAvail <= 0) return;

    const basePrice =
      product.promoPrice && product.promoPrice > 0 && product.promoPrice < product.price
        ? product.promoPrice
        : product.price;
    const unitPrice = Number((basePrice + (variant?.priceDelta || 0)).toFixed(2));
    if (unitPrice <= 0) return;

    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === product.id && i.variantId === variant?.id
      );
      if (idx >= 0) {
        const next = [...prev];
        const nextQty = Math.min(maxAvail, next[idx].quantity + quantity);
        next[idx] = { ...next[idx], quantity: nextQty, maxAvailable: maxAvail, unitPrice };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0] || '',
          variantId: variant?.id,
          variantLabel: variant?.label,
          unitPrice,
          costPrice: product.costPrice,
          quantity: Math.min(maxAvail, Math.max(1, quantity)),
          weightKg: product.weightKg || 0.5,
          heightCm: product.heightCm || 10,
          widthCm: product.widthCm || 15,
          lengthCm: product.lengthCm || 20,
          sourceType: product.sourceType,
          maxAvailable: maxAvail,
        },
      ];
    });
    setCartDrawerOpen(true);
  };

  const updateCartQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity: Math.min(item.maxAvailable, quantity) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const applyCouponCode = async (code: string): Promise<boolean> => {
    setCouponError(null);
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      setCouponError('Informe um código de cupom.');
      return false;
    }
    const coupon = await getCouponByCode(cleaned);
    if (!coupon || !coupon.active) {
      setCouponError('Cupom inválido ou inativo.');
      setAppliedCoupon(null);
      return false;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      setCouponError('Este cupom está expirado.');
      setAppliedCoupon(null);
      return false;
    }
    setAppliedCoupon(coupon);
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        currentPath,
        navigate,
        products,
        productsLoading,
        categories,
        settings,
        shippingSettings,
        cart,
        cartCount,
        cartDrawerOpen,
        setCartDrawerOpen,
        appliedCoupon,
        couponError,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCouponCode,
        removeCoupon,
        refreshSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider');
  return ctx;
}
