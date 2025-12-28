/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Asset Constants
 *
 * Assets in Interledger represent currencies or tokens that can be transferred.
 * Each asset has:
 * - Code: Identifier (usually ISO 4217 for fiat, or custom for crypto)
 * - Scale: Number of decimal places (e.g., 2 for USD cents, 9 for XRP drops)
 *
 * Amounts are always represented as integers in the smallest unit.
 * For example:
 * - $1.00 USD with scale 2 = 100
 * - 1 XRP with scale 9 = 1000000000
 */

/**
 * Common fiat currency assets
 */
export const FIAT_ASSETS = {
  USD: { code: 'USD', scale: 2, name: 'US Dollar' },
  EUR: { code: 'EUR', scale: 2, name: 'Euro' },
  GBP: { code: 'GBP', scale: 2, name: 'British Pound' },
  JPY: { code: 'JPY', scale: 0, name: 'Japanese Yen' },
  CHF: { code: 'CHF', scale: 2, name: 'Swiss Franc' },
  CAD: { code: 'CAD', scale: 2, name: 'Canadian Dollar' },
  AUD: { code: 'AUD', scale: 2, name: 'Australian Dollar' },
  NZD: { code: 'NZD', scale: 2, name: 'New Zealand Dollar' },
  CNY: { code: 'CNY', scale: 2, name: 'Chinese Yuan' },
  INR: { code: 'INR', scale: 2, name: 'Indian Rupee' },
  MXN: { code: 'MXN', scale: 2, name: 'Mexican Peso' },
  BRL: { code: 'BRL', scale: 2, name: 'Brazilian Real' },
  ZAR: { code: 'ZAR', scale: 2, name: 'South African Rand' },
  KRW: { code: 'KRW', scale: 0, name: 'South Korean Won' },
  SGD: { code: 'SGD', scale: 2, name: 'Singapore Dollar' },
  HKD: { code: 'HKD', scale: 2, name: 'Hong Kong Dollar' },
  SEK: { code: 'SEK', scale: 2, name: 'Swedish Krona' },
  NOK: { code: 'NOK', scale: 2, name: 'Norwegian Krone' },
  DKK: { code: 'DKK', scale: 2, name: 'Danish Krone' },
  PLN: { code: 'PLN', scale: 2, name: 'Polish Zloty' },
} as const;

/**
 * Cryptocurrency assets
 */
export const CRYPTO_ASSETS = {
  XRP: { code: 'XRP', scale: 6, name: 'Ripple' },
  BTC: { code: 'BTC', scale: 8, name: 'Bitcoin' },
  ETH: { code: 'ETH', scale: 18, name: 'Ethereum' },
  XLM: { code: 'XLM', scale: 7, name: 'Stellar Lumens' },
  USDC: { code: 'USDC', scale: 6, name: 'USD Coin' },
  USDT: { code: 'USDT', scale: 6, name: 'Tether' },
  DAI: { code: 'DAI', scale: 18, name: 'Dai' },
  LTC: { code: 'LTC', scale: 8, name: 'Litecoin' },
  BCH: { code: 'BCH', scale: 8, name: 'Bitcoin Cash' },
  DOGE: { code: 'DOGE', scale: 8, name: 'Dogecoin' },
} as const;

/**
 * All known assets
 */
export const KNOWN_ASSETS = {
  ...FIAT_ASSETS,
  ...CRYPTO_ASSETS,
} as const;

/**
 * Asset type definition
 */
export interface Asset {
  code: string;
  scale: number;
  name?: string;
}

/**
 * Get asset info by code
 */
export function getAsset(code: string): Asset | undefined {
  const upperCode = code.toUpperCase();
  return KNOWN_ASSETS[upperCode as keyof typeof KNOWN_ASSETS];
}

/**
 * Get default scale for an asset
 */
export function getAssetScale(code: string): number {
  const asset = getAsset(code);
  return asset?.scale ?? 2; // Default to 2 decimal places
}

/**
 * Convert amount from display format to integer (smallest unit)
 */
export function toSmallestUnit(amount: number | string, scale: number): bigint {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const multiplier = BigInt(10 ** scale);
  const scaledAmount = Math.round(numAmount * Number(multiplier));
  return BigInt(scaledAmount);
}

/**
 * Convert amount from integer (smallest unit) to display format
 */
export function fromSmallestUnit(amount: bigint | string | number, scale: number): string {
  const bigAmount = BigInt(amount);
  const divisor = BigInt(10 ** scale);
  const integerPart = bigAmount / divisor;
  const fractionalPart = bigAmount % divisor;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(scale, '0');
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '');
}

/**
 * Format amount for display
 */
export function formatAmount(
  amount: bigint | string | number,
  assetCode: string,
  options?: { locale?: string; showCode?: boolean },
): string {
  const asset = getAsset(assetCode);
  const scale = asset?.scale ?? 2;
  const displayAmount = fromSmallestUnit(amount, scale);
  const locale = options?.locale ?? 'en-US';

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: scale,
  }).format(parseFloat(displayAmount));

  if (options?.showCode !== false) {
    return `${formatted} ${assetCode}`;
  }

  return formatted;
}

/**
 * Validate asset code format
 */
export function isValidAssetCode(code: string): boolean {
  // Asset codes are typically 3-4 uppercase letters
  return /^[A-Z]{2,6}$/.test(code.toUpperCase());
}

/**
 * Validate asset scale
 */
export function isValidAssetScale(scale: number): boolean {
  return Number.isInteger(scale) && scale >= 0 && scale <= 255;
}

/**
 * Convert between assets with exchange rate
 */
export function convertAmount(
  amount: bigint,
  fromScale: number,
  toScale: number,
  exchangeRate: number,
): bigint {
  // Normalize to a common scale for calculation
  const scaleDiff = toScale - fromScale;
  let converted: bigint;

  if (scaleDiff >= 0) {
    converted = amount * BigInt(10 ** scaleDiff);
  } else {
    converted = amount / BigInt(10 ** -scaleDiff);
  }

  // Apply exchange rate (using fixed point arithmetic)
  const ratePrecision = 1000000; // 6 decimal places
  const rateMultiplier = BigInt(Math.round(exchangeRate * ratePrecision));
  converted = (converted * rateMultiplier) / BigInt(ratePrecision);

  return converted;
}

/**
 * Asset for n8n dropdown options
 */
export const ASSET_OPTIONS = Object.values(KNOWN_ASSETS).map((asset) => ({
  name: `${asset.code} - ${asset.name}`,
  value: asset.code,
}));
