import { PricingMode, Product } from '../types';

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function unitSuggestsMode(unit: string, mode: PricingMode): boolean {
  const low = String(unit || '').toLowerCase();
  if (mode === 'piece') return low.includes('шт');
  if (mode === 'm2') return low.includes('м2') || low.includes('м²');
  return false;
}

export function getUnitLabel(mode: PricingMode): string {
  if (mode === 'm2') return 'м²';
  return 'шт';
}

export function getUnitPriceForMode(product: Product, mode: PricingMode): number | undefined {
  const prices = product.prices || {};

  if (mode === 'piece') {
    return toNumber(prices.perPiece ?? (unitSuggestsMode(product.unit, 'piece') ? prices.retail : undefined));
  }
  if (mode === 'm2') {
    return toNumber(prices.perM2 ?? (unitSuggestsMode(product.unit, 'm2') ? (prices.retail ?? prices.client ?? prices.online) : undefined));
  }
  return undefined;
}

export function getAvailablePricingModes(product: Product): PricingMode[] {
  const modes: PricingMode[] = ['piece', 'm2'].filter((mode) => getUnitPriceForMode(product, mode) !== undefined) as PricingMode[];
  return modes.length > 0 ? modes : ['piece'];
}

export function getBestDisplayPrice(product: Product): { mode: PricingMode; price?: number } {
  const modes = getAvailablePricingModes(product);
  const mode = modes[0];
  return { mode, price: getUnitPriceForMode(product, mode) };
}
