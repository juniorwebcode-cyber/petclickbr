import type { RoundingMode } from '../types/petclick';

export interface PricingRuleInput {
  costPrice: number;
  generalMarginPercent?: number;
  categoryMarginPercent?: number;
  individualMarginPercent?: number;
  supplierSurchargePercent?: number;
  minPrice?: number;
  maxPrice?: number;
  roundingMode?: RoundingMode;
}

export interface ProfitBreakdownInput {
  salePrice: number;
  productCost: number;
  absorbedShipping?: number;
  paymentFeePercent?: number;
  paymentFeeFixed?: number;
  variableExpenses?: number;
}

export interface ProfitBreakdownResult {
  salePrice: number;
  productCost: number;
  absorbedShipping: number;
  paymentFees: number;
  variableExpenses: number;
  estimatedProfit: number;
  realMarginPercent: number;
}

export function applyCommercialRounding(rawPrice: number, mode: RoundingMode = 'none'): number {
  const safe = Math.max(0, Number(rawPrice) || 0);
  if (safe === 0) return 0;

  switch (mode) {
    case 'cents_90': {
      const whole = Math.floor(safe);
      const candidate = whole + 0.9;
      return Number((candidate >= safe ? candidate : whole + 1 + 0.9).toFixed(2));
    }
    case 'cents_99': {
      const whole = Math.floor(safe);
      const candidate = whole + 0.99;
      return Number((candidate >= safe ? candidate : whole + 1 + 0.99).toFixed(2));
    }
    case 'nearest_int':
      return Number(Math.round(safe).toFixed(2));
    case 'none':
    default:
      return Number(safe.toFixed(2));
  }
}

export function calculateSalePrice(input: PricingRuleInput): {
  effectiveMarkupPercent: number;
  rawPrice: number;
  finalPrice: number;
} {
  const cost = Math.max(0, Number(input.costPrice) || 0);
  const baseMargin =
    input.individualMarginPercent ??
    input.categoryMarginPercent ??
    input.generalMarginPercent ??
    50;
  const surcharge = Number(input.supplierSurchargePercent) || 0;
  const effectiveMarkupPercent = Number((baseMargin + surcharge).toFixed(2));

  // Formula: Preço de venda = custo de aquisição x (1 + percentual / 100)
  const rawPrice = Number((cost * (1 + effectiveMarkupPercent / 100)).toFixed(2));
  let finalPrice = applyCommercialRounding(rawPrice, input.roundingMode || 'none');

  if (typeof input.minPrice === 'number' && input.minPrice > 0) {
    finalPrice = Math.max(finalPrice, input.minPrice);
  }
  if (typeof input.maxPrice === 'number' && input.maxPrice > 0 && input.maxPrice >= (input.minPrice || 0)) {
    finalPrice = Math.min(finalPrice, input.maxPrice);
  }

  return {
    effectiveMarkupPercent,
    rawPrice,
    finalPrice: Number(finalPrice.toFixed(2)),
  };
}

export function calculateRealProfit(input: ProfitBreakdownInput): ProfitBreakdownResult {
  const salePrice = Math.max(0, Number(input.salePrice) || 0);
  const productCost = Math.max(0, Number(input.productCost) || 0);
  const absorbedShipping = Math.max(0, Number(input.absorbedShipping) || 0);
  const feePercent = Math.max(0, Number(input.paymentFeePercent) || 0);
  const feeFixed = Math.max(0, Number(input.paymentFeeFixed) || 0);
  const paymentFees = Number(((salePrice * feePercent) / 100 + feeFixed).toFixed(2));
  const variableExpenses = Math.max(0, Number(input.variableExpenses) || 0);

  // Lucro estimado = preço de venda - custo do produto - frete absorvido - taxas - despesas variáveis
  const estimatedProfit = Number(
    (salePrice - productCost - absorbedShipping - paymentFees - variableExpenses).toFixed(2)
  );
  const realMarginPercent =
    salePrice > 0 ? Number(((estimatedProfit / salePrice) * 100).toFixed(2)) : 0;

  return {
    salePrice,
    productCost,
    absorbedShipping,
    paymentFees,
    variableExpenses,
    estimatedProfit,
    realMarginPercent,
  };
}

export function canAutoUpdatePrice(
  manualPriceLocked: boolean,
  explicitAdminOverride = false
): boolean {
  if (!manualPriceLocked) return true;
  return explicitAdminOverride;
}
