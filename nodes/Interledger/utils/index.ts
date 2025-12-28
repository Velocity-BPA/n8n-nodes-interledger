/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Interledger Utilities
 *
 * This module exports all utility functions used throughout the node:
 * - HTTP signature creation and verification
 * - ILP packet serialization and parsing
 * - Payment pointer handling
 * - Amount conversion and formatting
 */

export * from './signatureUtils';
export * from './packetUtils';
export * from './paymentPointerUtils';
export * from './amountUtils';

/**
 * Licensing notice flag to ensure single logging
 */
let licensingNoticeShown = false;

/**
 * Show licensing notice once per node load
 */
export function showLicensingNotice(): void {
  if (licensingNoticeShown) return;

  console.warn(
    '[Velocity BPA Licensing Notice] ' +
    'This n8n node is licensed under the Business Source License 1.1 (BSL 1.1). ' +
    'Use of this node by for-profit organizations in production environments ' +
    'requires a commercial license from Velocity BPA. ' +
    'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.'
  );

  licensingNoticeShown = true;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Omit keys from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick keys from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  const id = `${timestamp}${random}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Format date for ILP (ISO 8601 without milliseconds)
 */
export function formatIlpDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Parse ILP date format
 */
export function parseIlpDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Mask sensitive data (keep first and last N chars)
 */
export function maskSensitive(data: string, keepChars: number = 4): string {
  if (data.length <= keepChars * 2) {
    return '*'.repeat(data.length);
  }
  const start = data.substring(0, keepChars);
  const end = data.substring(data.length - keepChars);
  const middle = '*'.repeat(Math.min(data.length - keepChars * 2, 8));
  return `${start}${middle}${end}`;
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Convert object keys to camelCase
 */
export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
        letter.toUpperCase(),
      );
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[camelKey] = toCamelCase(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? toCamelCase(item as Record<string, unknown>)
            : item,
        );
      } else {
        result[camelKey] = value;
      }
    }
  }

  return result;
}

/**
 * Convert object keys to snake_case
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[snakeKey] = toSnakeCase(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? toSnakeCase(item as Record<string, unknown>)
            : item,
        );
      } else {
        result[snakeKey] = value;
      }
    }
  }

  return result;
}
