/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Amount Utilities
 *
 * Interledger uses integer amounts with asset scales for precision.
 * This avoids floating-point issues in financial calculations.
 *
 * Examples:
 * - $1.50 with scale 2 = 150 (cents)
 * - 1.5 XRP with scale 6 = 1500000 (drops)
 * - 0.001 BTC with scale 8 = 100000 (satoshis)
 *
 * All amounts in ILP packets are strings representing unsigned 64-bit integers.
 */

/**
 * Amount with asset details
 */
export interface Amount {
  value: string;
  assetCode: string;
  assetScale: number;
}

/**
 * Parsed amount result
 */
export interface ParsedAmount {
  integer: bigint;
  display: string;
  assetCode: string;
  assetScale: number;
}

/**
 * Convert a display amount (e.g., "1.50") to integer amount
 */
export function toIntegerAmount(displayAmount: string | number, scale: number): string {
  const numAmount = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount;

  if (isNaN(numAmount)) {
    throw new Error('Invalid amount: must be a valid number');
  }

  if (numAmount < 0) {
    throw new Error('Invalid amount: must be non-negative');
  }

  // Use BigInt for precision
  const multiplier = BigInt(10 ** scale);
  const scaled = Math.round(numAmount * Number(multiplier));

  if (scaled > Number.MAX_SAFE_INTEGER) {
    // For very large numbers, use string parsing
    const parts = numAmount.toString().split('.');
    const intPart = BigInt(parts[0]) * multiplier;

    if (parts[1]) {
      const decPart = parts[1].padEnd(scale, '0').substring(0, scale);
      return (intPart + BigInt(decPart)).toString();
    }

    return intPart.toString();
  }

  return BigInt(scaled).toString();
}

/**
 * Convert an integer amount to display format
 */
export function toDisplayAmount(integerAmount: string | bigint, scale: number): string {
  const amount = BigInt(integerAmount);
  const divisor = BigInt(10 ** scale);

  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(scale, '0');
  // Trim trailing zeros
  const trimmed = fractionalStr.replace(/0+$/, '');

  return `${integerPart}.${trimmed}`;
}

/**
 * Format amount with currency symbol/code
 */
export function formatAmount(amount: Amount, options?: {
  locale?: string;
  showCode?: boolean;
  symbolPosition?: 'before' | 'after';
}): string {
  const displayValue = toDisplayAmount(amount.value, amount.assetScale);
  const locale = options?.locale ?? 'en-US';
  const showCode = options?.showCode ?? true;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount.assetScale,
  }).format(parseFloat(displayValue));

  if (!showCode) {
    return formatted;
  }

  const position = options?.symbolPosition ?? 'after';
  if (position === 'before') {
    return `${amount.assetCode} ${formatted}`;
  }

  return `${formatted} ${amount.assetCode}`;
}

/**
 * Parse a formatted amount string
 */
export function parseAmount(
  amountStr: string,
  assetCode: string,
  assetScale: number,
): Amount {
  // Remove currency code if present
  const cleanedStr = amountStr
    .replace(assetCode, '')
    .replace(/[,$\s]/g, '')
    .trim();

  const value = toIntegerAmount(cleanedStr, assetScale);

  return {
    value,
    assetCode,
    assetScale,
  };
}

/**
 * Add two amounts
 */
export function addAmounts(a: Amount, b: Amount): Amount {
  assertSameAsset(a, b);

  const sum = BigInt(a.value) + BigInt(b.value);

  return {
    value: sum.toString(),
    assetCode: a.assetCode,
    assetScale: a.assetScale,
  };
}

/**
 * Subtract two amounts
 */
export function subtractAmounts(a: Amount, b: Amount): Amount {
  assertSameAsset(a, b);

  const diff = BigInt(a.value) - BigInt(b.value);

  if (diff < BigInt(0)) {
    throw new Error('Subtraction would result in negative amount');
  }

  return {
    value: diff.toString(),
    assetCode: a.assetCode,
    assetScale: a.assetScale,
  };
}

/**
 * Multiply amount by a factor
 */
export function multiplyAmount(amount: Amount, factor: number): Amount {
  const value = BigInt(amount.value);
  const precision = 1000000; // 6 decimal places for factor

  const scaledFactor = BigInt(Math.round(factor * precision));
  const result = (value * scaledFactor) / BigInt(precision);

  return {
    value: result.toString(),
    assetCode: amount.assetCode,
    assetScale: amount.assetScale,
  };
}

/**
 * Divide amount by a divisor
 */
export function divideAmount(amount: Amount, divisor: number): Amount {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }

  const value = BigInt(amount.value);
  const precision = 1000000; // 6 decimal places

  const scaledDivisor = BigInt(Math.round(divisor * precision));
  const result = (value * BigInt(precision)) / scaledDivisor;

  return {
    value: result.toString(),
    assetCode: amount.assetCode,
    assetScale: amount.assetScale,
  };
}

/**
 * Compare two amounts
 */
export function compareAmounts(a: Amount, b: Amount): number {
  assertSameAsset(a, b);

  const aValue = BigInt(a.value);
  const bValue = BigInt(b.value);

  if (aValue < bValue) return -1;
  if (aValue > bValue) return 1;
  return 0;
}

/**
 * Check if amount a is greater than amount b
 */
export function isGreaterThan(a: Amount, b: Amount): boolean {
  return compareAmounts(a, b) > 0;
}

/**
 * Check if amount a is less than amount b
 */
export function isLessThan(a: Amount, b: Amount): boolean {
  return compareAmounts(a, b) < 0;
}

/**
 * Check if amount a equals amount b
 */
export function isEqual(a: Amount, b: Amount): boolean {
  return compareAmounts(a, b) === 0;
}

/**
 * Check if amount is zero
 */
export function isZero(amount: Amount): boolean {
  return BigInt(amount.value) === BigInt(0);
}

/**
 * Convert amount between different scales
 */
export function convertScale(amount: Amount, newScale: number): Amount {
  const scaleDiff = newScale - amount.assetScale;
  let newValue: bigint;

  if (scaleDiff > 0) {
    // Increase scale (multiply)
    newValue = BigInt(amount.value) * BigInt(10 ** scaleDiff);
  } else if (scaleDiff < 0) {
    // Decrease scale (divide with rounding)
    const divisor = BigInt(10 ** -scaleDiff);
    newValue = BigInt(amount.value) / divisor;
  } else {
    newValue = BigInt(amount.value);
  }

  return {
    value: newValue.toString(),
    assetCode: amount.assetCode,
    assetScale: newScale,
  };
}

/**
 * Apply exchange rate to convert between currencies
 */
export function applyExchangeRate(
  amount: Amount,
  rate: number,
  targetAssetCode: string,
  targetAssetScale: number,
): Amount {
  // First convert to target scale
  const scaleDiff = targetAssetScale - amount.assetScale;
  let scaledValue = BigInt(amount.value);

  if (scaleDiff > 0) {
    scaledValue = scaledValue * BigInt(10 ** scaleDiff);
  } else if (scaleDiff < 0) {
    scaledValue = scaledValue / BigInt(10 ** -scaleDiff);
  }

  // Apply rate
  const precision = BigInt(1000000000); // 9 decimal places
  const scaledRate = BigInt(Math.round(rate * Number(precision)));
  const convertedValue = (scaledValue * scaledRate) / precision;

  return {
    value: convertedValue.toString(),
    assetCode: targetAssetCode,
    assetScale: targetAssetScale,
  };
}

/**
 * Calculate minimum amount for slippage
 */
export function calculateMinAmount(amount: Amount, slippageBps: number): Amount {
  const basisPoints = BigInt(10000);
  const slippage = BigInt(slippageBps);
  const value = BigInt(amount.value);

  const minValue = value - (value * slippage) / basisPoints;

  return {
    value: minValue.toString(),
    assetCode: amount.assetCode,
    assetScale: amount.assetScale,
  };
}

/**
 * Calculate maximum amount for slippage
 */
export function calculateMaxAmount(amount: Amount, slippageBps: number): Amount {
  const basisPoints = BigInt(10000);
  const slippage = BigInt(slippageBps);
  const value = BigInt(amount.value);

  const maxValue = value + (value * slippage) / basisPoints;

  return {
    value: maxValue.toString(),
    assetCode: amount.assetCode,
    assetScale: amount.assetScale,
  };
}

/**
 * Create a zero amount
 */
export function zeroAmount(assetCode: string, assetScale: number): Amount {
  return {
    value: '0',
    assetCode,
    assetScale,
  };
}

/**
 * Create an amount from components
 */
export function createAmount(
  value: string | number | bigint,
  assetCode: string,
  assetScale: number,
): Amount {
  let stringValue: string;

  if (typeof value === 'bigint') {
    stringValue = value.toString();
  } else if (typeof value === 'number') {
    stringValue = toIntegerAmount(value, assetScale);
  } else {
    // Check if it's a display format or integer
    if (value.includes('.')) {
      stringValue = toIntegerAmount(value, assetScale);
    } else {
      stringValue = value;
    }
  }

  return {
    value: stringValue,
    assetCode,
    assetScale,
  };
}

/**
 * Assert that two amounts have the same asset
 */
function assertSameAsset(a: Amount, b: Amount): void {
  if (a.assetCode !== b.assetCode) {
    throw new Error(`Asset code mismatch: ${a.assetCode} vs ${b.assetCode}`);
  }
  if (a.assetScale !== b.assetScale) {
    throw new Error(`Asset scale mismatch: ${a.assetScale} vs ${b.assetScale}`);
  }
}

/**
 * Validate amount value
 */
export function validateAmount(amount: Amount): { valid: boolean; error?: string } {
  try {
    const value = BigInt(amount.value);
    if (value < BigInt(0)) {
      return { valid: false, error: 'Amount must be non-negative' };
    }
    if (amount.assetScale < 0 || amount.assetScale > 255) {
      return { valid: false, error: 'Asset scale must be between 0 and 255' };
    }
    if (!amount.assetCode || amount.assetCode.length < 2 || amount.assetCode.length > 6) {
      return { valid: false, error: 'Asset code must be 2-6 characters' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid amount value' };
  }
}
