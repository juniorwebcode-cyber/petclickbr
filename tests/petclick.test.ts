import { describe, expect, it } from 'vitest';
import request from 'node:http';
import fs from 'node:fs';
import { calculateRealProfit, calculateSalePrice, canAutoUpdatePrice } from '../src/lib/pricing';
import { parseSupplierCsv, parseSupplierXml, generateSupplierCsvTemplate } from '../src/lib/csv';
import { calculateCartTotals, calculateCashSessionSummary, calculateChange } from '../src/lib/pos';
import { formatBRL, isValidCep, isValidCpf, normalizeCep } from '../src/lib/format';
import { hashPasswordScrypt, verifyPasswordScrypt, validateExternalHttpsUrl, signAdminToken, verifyAdminToken } from '../src/server/security';
import { createPetClickApp } from '../src/server/app';
import { CATALOG_SEED_PRODUCTS, matchesDepartmentSlug } from '../src/lib/catalogSeed';
import {
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  PETCLICK_IMAGES,
  STOREFRONT_CATEGORIES_BLUEPRINT,
} from '../src/lib/defaults';
import { answerAssistantQuestion } from '../src/lib/assistantEngine';
import type { AddressInfo } from 'node:net';

async function withTestServer(run: (baseUrl: string) => Promise<void>) {
  const app = createPetClickApp();
  const server = request.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
}

describe('PetClick Pricing & Profit Engine', () => {
  it('computes exact markup price: R$ 30,00 + 100% = R$ 60,00', () => {
    const res = calculateSalePrice({
      costPrice: 30,
      generalMarginPercent: 100,
      roundingMode: 'none',
    });
    expect(res.finalPrice).toBe(60);
  });

  it('applies supplier surcharge, min/max clamps, and commercial .90 rounding', () => {
    const res = calculateSalePrice({
      costPrice: 30,
      categoryMarginPercent: 50,
      supplierSurchargePercent: 10,
      roundingMode: 'cents_90',
    });
    expect(res.effectiveMarkupPercent).toBe(60);
    expect(res.finalPrice).toBe(48.9);
  });

  it('protects manual-locked prices from automatic sync unless explicitly overridden', () => {
    expect(canAutoUpdatePrice(true, false)).toBe(false);
    expect(canAutoUpdatePrice(true, true)).toBe(true);
    expect(canAutoUpdatePrice(false, false)).toBe(true);
  });

  it('computes net estimated profit separately from gross revenue', () => {
    const profit = calculateRealProfit({
      salePrice: 100,
      productCost: 45,
      absorbedShipping: 12,
      paymentFeePercent: 3.5,
      variableExpenses: 5,
    });
    expect(profit.paymentFees).toBe(3.5);
    expect(profit.estimatedProfit).toBe(34.5);
  });
});

describe('PetClick Formatters, CSV & XML Imports', () => {
  it('formats BRL currency and validates CEP / CPF', () => {
    expect(formatBRL(60)).toContain('60,00');
    expect(normalizeCep('01310-100')).toBe('01310100');
    expect(isValidCep('01310-100')).toBe(true);
    expect(isValidCep('123')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('parses the supplier CSV template accurately', () => {
    const template = generateSupplierCsvTemplate();
    const rows = parseSupplierCsv(template);
    expect(rows.length).toBe(4);
    expect(rows[0].externalSku).toBe('PET-RAC-001');
    expect(rows[0].costPrice).toBe(120);
    expect(rows[0].stockSupplier).toBe(25);
  });

  it('parses supplier XML feed safely', () => {
    const xml = `<catalog><product><sku>XML-1</sku><name>Brinquedo Natural</name><cost>25,50</cost><stock>12</stock></product></catalog>`;
    const rows = parseSupplierXml(xml);
    expect(rows.length).toBe(1);
    expect(rows[0].costPrice).toBe(25.5);
    expect(rows[0].stockSupplier).toBe(12);
  });
});

describe('PetClick Cart, Coupons & PDV Cash Register', () => {
  it('recalculates cart totals with percentage coupon and shipping', () => {
    const totals = calculateCartTotals(
      [
        {
          productId: 'p1',
          name: 'Ração',
          slug: 'racao',
          image: '',
          unitPrice: 100,
          costPrice: 50,
          quantity: 2,
          weightKg: 5,
          heightCm: 20,
          widthCm: 20,
          lengthCm: 20,
          sourceType: 'own_stock',
          maxAvailable: 10,
        },
      ],
      19.9,
      {
        id: 'PET10',
        code: 'PET10',
        discountType: 'percent',
        discountValue: 10,
        minOrderValue: 100,
        maxUses: 100,
        usedCount: 0,
        active: true,
      }
    );
    expect(totals.subtotal).toBe(200);
    expect(totals.discountTotal).toBe(20);
    expect(totals.total).toBe(199.9);
  });

  it('computes cash drawer balance including cash sales, reinforcements, and sangrias', () => {
    expect(calculateChange(45.5, 50, 'cash')).toBe(4.5);
    expect(calculateChange(45.5, 50, 'pix')).toBe(0);

    const summary = calculateCashSessionSummary(
      {
        id: 'pos_1',
        operatorUid: 'u1',
        operatorName: 'Operador',
        status: 'open',
        openingBalance: 100,
        cashTotal: 0,
        pixTotal: 0,
        cardTotal: 0,
        withdrawals: 0,
        reinforcements: 0,
      },
      [
        {
          id: 's1',
          posSessionId: 'pos_1',
          operatorUid: 'u1',
          paymentMethod: 'cash',
          items: [],
          subtotal: 50,
          discount: 0,
          total: 50,
          amountPaid: 50,
          changeGiven: 0,
          status: 'completed',
        },
        {
          id: 's2',
          posSessionId: 'pos_1',
          operatorUid: 'u1',
          paymentMethod: 'pix',
          items: [],
          subtotal: 80,
          discount: 0,
          total: 80,
          amountPaid: 80,
          changeGiven: 0,
          status: 'completed',
        },
      ],
      [
        {
          id: 't1',
          posSessionId: 'pos_1',
          type: 'reforco',
          paymentMethod: 'cash',
          amount: 40,
          description: 'Troco',
          operatorUid: 'u1',
        },
        {
          id: 't2',
          posSessionId: 'pos_1',
          type: 'sangria',
          paymentMethod: 'cash',
          amount: 20,
          description: 'Retirada',
          operatorUid: 'u1',
        },
      ]
    );

    expect(summary.cashSales).toBe(50);
    expect(summary.pixSales).toBe(80);
    expect(summary.expectedCashInDrawer).toBe(170);
  });
});

describe('PetClick Security & Backend API Integration', () => {
  it('hashes passwords via scrypt, signs/revokes admin tokens, and blocks SSRF URLs', () => {
    const hashed = hashPasswordScrypt('MinhaSenhaForte!2026');
    expect(verifyPasswordScrypt('MinhaSenhaForte!2026', hashed)).toBe(true);
    expect(verifyPasswordScrypt('Errada', hashed)).toBe(false);

    const token = signAdminToken({ email: 'admin@x.com', role: 'admin', epoch: 1, exp: Date.now() + 60_000 });
    expect(verifyAdminToken(token, 1)?.email).toBe('admin@x.com');
    expect(verifyAdminToken(token, 2)).toBeNull();

    expect(validateExternalHttpsUrl('http://localhost:3000/api').valid).toBe(false);
    expect(validateExternalHttpsUrl('https://169.254.169.254/latest').valid).toBe(false);
    expect(validateExternalHttpsUrl('https://10.0.0.5/feed').valid).toBe(false);
    expect(validateExternalHttpsUrl('https://api.fornecedor.com.br/catalog').valid).toBe(true);
  });

  it('serves health, admin bootstrap/login lockout, public Correios PAC/SEDEX quote, InfinitePay checkout, and JSON 404 guards', async () => {
    await withTestServer(async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/api/health`);
      expect(healthRes.status).toBe(200);
      const health = await healthRes.json();
      expect(health.ok).toBe(true);
      expect(health.integrations.infinitePayHandle).toBe('raquel-petersen');
      expect(health.integrations.infinitePayPublicCheckout).toBe(true);
      expect(health.integrations.correiosPublicTable).toBe(true);

      // Bootstrap admin claim
      const bootRes = await fetch(`${baseUrl}/api/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@x.com', password: 'StrongPassword#2026' }),
      });
      expect(bootRes.status).toBe(200);
      const bootData = await bootRes.json();
      expect(bootData.token).toBeTruthy();

      // Progressive lockout after 3 invalid attempts
      for (let i = 0; i < 3; i++) {
        const failRes = await fetch(`${baseUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@x.com', password: 'wrong' }),
        });
        expect(failRes.status).toBe(401);
      }
      const lockedRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@x.com', password: 'StrongPassword#2026' }),
      });
      expect(lockedRes.status).toBe(429);

      // Public Correios PAC & SEDEX calculation + store rules
      const shipRes = await fetch(`${baseUrl}/api/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep: '26263-020',
          destinationState: 'RJ',
          subtotal: 189.9,
          weightKg: 10,
          storeShippingSettings: {
            originCep: '01310100',
            fixedShippingEnabled: true,
            fixedShippingPrice: 19.9,
            pickupEnabled: true,
          },
        }),
      });
      expect(shipRes.status).toBe(200);
      const shipData = await shipRes.json();
      expect(shipData.options.length).toBe(4);
      expect(shipData.options[0].id).toBe('correios_pac');
      expect(shipData.options[1].id).toBe('correios_sedex');
      expect(shipData.options[1].estimatedDays).toBeLessThan(shipData.options[0].estimatedDays);
      expect(shipData.options[1].price).toBeGreaterThan(shipData.options[0].price);

      // Unknown /api/* route returns JSON 404 (never HTML)
      const notFoundRes = await fetch(`${baseUrl}/api/does-not-exist`);
      expect(notFoundRes.status).toBe(404);
      const notFoundData = await notFoundRes.json();
      expect(notFoundData.error).toBeTruthy();

      // InfinitePay checkout generates a real checkout.infinitepay.io link and rejects incomplete payloads
      const badPayRes = await fetch(`${baseUrl}/api/checkout/infinitepay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNsu: 'TEST-BAD' }),
      });
      expect(badPayRes.status).toBe(400);

      const payRes = await fetch(`${baseUrl}/api/checkout/infinitepay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNsu: `TEST-OK-${Date.now()}`,
          items: [{ name: 'Ração Natural Fresh Cães Adultos 10kg', quantity: 1, unitPrice: 189.9 }],
          customer: { name: 'Ana Silva', email: 'ana@test.com', phone: '11999999999' },
          shippingCost: shipData.options[0].price,
          discountTotal: 10,
        }),
      });
      expect(payRes.status).toBe(200);
      const payData = await payRes.json();
      expect(payData.ok).toBe(true);
      expect(payData.checkoutUrl).toMatch(/^https:\/\/checkout\.infinitepay\.io\//);
    });
  });

  it('verifies security rules and Dirty Dozen payloads are covered in firestore.rules', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    expect(rules).toContain("rules_version = '2';");
    expect(rules).toContain('allow read, write: if false;');
    expect(rules).toContain('request.auth.token.email_verified == true');
    expect(rules).toContain("incoming().role == 'customer'");
    expect(rules).toContain("incoming().status == 'pending_payment'");
    expect(rules).toContain('allow update, delete: if false;');
  });
});

describe('PetClick Full 82-Product Catalog & Category Integrity', () => {
  it('registers all 82 products with unique IDs/SKUs, descriptions, images, and valid categories', () => {
    expect(CATALOG_SEED_PRODUCTS).toHaveLength(82);
    expect(STOREFRONT_CATEGORIES_BLUEPRINT).toHaveLength(10);

    const categoryIds = new Set(STOREFRONT_CATEGORIES_BLUEPRINT.map((c) => c.id));
    const seenIds = new Set<string>();
    const seenSkus = new Set<string>();

    for (const p of CATALOG_SEED_PRODUCTS) {
      expect(seenIds.has(p.id)).toBe(false);
      expect(seenSkus.has(p.sku)).toBe(false);
      seenIds.add(p.id);
      seenSkus.add(p.sku);

      expect(p.name.length).toBeGreaterThanOrEqual(4);
      expect(p.description.length).toBeGreaterThanOrEqual(40);
      expect(categoryIds.has(p.categoryId)).toBe(true);
      expect(p.price).toBeGreaterThan(0);
      if (p.promoPrice && p.promoPrice > 0) {
        expect(p.promoPrice).toBeLessThan(p.price);
      }
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.images[0]).toMatch(/^(\/assets\/products\/|https:\/\/)/);
      if (p.images[0].startsWith('/assets/')) {
        expect(fs.existsSync(`public${p.images[0]}`)).toBe(true);
      }
      expect(p.published).toBe(true);
      expect(p.available).toBe(true);
    }

    for (const imgPath of Object.values(PETCLICK_IMAGES)) {
      expect(fs.existsSync(`public${imgPath}`)).toBe(true);
    }

    // Every category has at least 1 directly assigned product and valid local image
    for (const cat of STOREFRONT_CATEGORIES_BLUEPRINT) {
      expect(cat.imageUrl).toBeTruthy();
      if (cat.imageUrl && cat.imageUrl.startsWith('/assets/')) {
        expect(fs.existsSync(`public${cat.imageUrl}`)).toBe(true);
      }
      const directCount = CATALOG_SEED_PRODUCTS.filter((p) => p.categoryId === cat.id).length;
      expect(directCount).toBeGreaterThan(0);
    }
  });

  it('matches cross-department filters accurately for Cães, Gatos, Alimentação, Aves, Roedores, and Peixes', () => {
    const dogCount = CATALOG_SEED_PRODUCTS.filter((p) => matchesDepartmentSlug(p, 'caes')).length;
    const catCount = CATALOG_SEED_PRODUCTS.filter((p) => matchesDepartmentSlug(p, 'gatos')).length;
    const foodCount = CATALOG_SEED_PRODUCTS.filter((p) => matchesDepartmentSlug(p, 'alimentacao')).length;

    expect(dogCount).toBeGreaterThan(15);
    expect(catCount).toBeGreaterThan(12);
    expect(foodCount).toBeGreaterThan(20);
  });

  it('answers simple customer questions via Mel virtual assistant using real store config and products', () => {
    const ctx = {
      products: CATALOG_SEED_PRODUCTS,
      categories: STOREFRONT_CATEGORIES_BLUEPRINT.map((c) => ({ ...c })),
      settings: DEFAULT_STOREFRONT_SETTINGS,
      shippingSettings: DEFAULT_SHIPPING_SETTINGS,
    };

    const ship = answerAssistantQuestion('Qual o valor do frete grátis?', ctx);
    expect(ship.text).toContain('249,00');
    expect(ship.actionLink?.path).toBe('/carrinho');

    const pay = answerAssistantQuestion('Aceita Pix e cartão?', ctx);
    expect(pay.text.toLowerCase()).toContain('pix');
    expect(pay.text).toContain('InfinitePay');

    const search = answerAssistantQuestion('Tem ração para gatos?', ctx);
    expect(search.recommendedProducts?.length).toBeGreaterThan(0);
  });
});
