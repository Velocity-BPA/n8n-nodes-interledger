/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Payment Pointer Utilities
 *
 * Payment pointers are human-readable identifiers for ILP wallet addresses.
 * They follow a format similar to email addresses but with a $ prefix.
 *
 * Format: $host/path
 * Example: $wallet.example.com/alice
 *
 * Resolution: Payment pointers resolve to URLs:
 * $host/path -> https://host/.well-known/pay/path
 */

/**
 * Payment pointer format regular expression
 */
export const PAYMENT_POINTER_REGEX = /^\$([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[a-zA-Z0-9._~%-]+)*$/;

/**
 * URL format regular expression
 */
export const URL_REGEX = /^https:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[a-zA-Z0-9._~%/-]*)?$/;

/**
 * Well-known pay path
 */
export const WELL_KNOWN_PAY = '/.well-known/pay';

/**
 * Payment pointer validation result
 */
export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Resolved payment pointer info
 */
export interface ResolvedPaymentPointer {
  url: string;
  host: string;
  path: string;
  original: string;
}

/**
 * Validate a payment pointer
 */
export function validatePaymentPointer(pointer: string): ValidationResult {
  if (!pointer) {
    return { valid: false, error: 'Payment pointer is required' };
  }

  // Check if it's a URL
  if (pointer.startsWith('https://')) {
    if (!URL_REGEX.test(pointer)) {
      return { valid: false, error: 'Invalid URL format' };
    }
    return { valid: true, normalized: pointer };
  }

  // Check payment pointer format
  if (!pointer.startsWith('$')) {
    return { valid: false, error: 'Payment pointer must start with $' };
  }

  if (!PAYMENT_POINTER_REGEX.test(pointer)) {
    return { valid: false, error: 'Invalid payment pointer format' };
  }

  return { valid: true, normalized: pointer };
}

/**
 * Check if a string is a valid payment pointer
 */
export function isValidPaymentPointer(pointer: string): boolean {
  return validatePaymentPointer(pointer).valid;
}

/**
 * Parse a payment pointer into host and path components
 */
export function parsePaymentPointer(pointer: string): { host: string; path: string } | null {
  if (!pointer) return null;

  // Handle URL format
  if (pointer.startsWith('https://')) {
    try {
      const url = new URL(pointer);
      let path = url.pathname;

      // Remove well-known prefix if present
      if (path.startsWith(WELL_KNOWN_PAY)) {
        path = path.substring(WELL_KNOWN_PAY.length);
      }

      return {
        host: url.host,
        path: path || '',
      };
    } catch {
      return null;
    }
  }

  // Handle payment pointer format
  if (!pointer.startsWith('$')) return null;

  const withoutDollar = pointer.substring(1);
  const slashIndex = withoutDollar.indexOf('/');

  if (slashIndex === -1) {
    return {
      host: withoutDollar,
      path: '',
    };
  }

  return {
    host: withoutDollar.substring(0, slashIndex),
    path: withoutDollar.substring(slashIndex),
  };
}

/**
 * Convert a payment pointer to a URL
 */
export function paymentPointerToUrl(pointer: string): string {
  if (!pointer) {
    throw new Error('Payment pointer is required');
  }

  // Already a URL
  if (pointer.startsWith('https://')) {
    return pointer;
  }

  // Must start with $
  if (!pointer.startsWith('$')) {
    throw new Error('Payment pointer must start with $ or be a https URL');
  }

  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer format');
  }

  return `https://${parsed.host}${WELL_KNOWN_PAY}${parsed.path}`;
}

/**
 * Convert a URL to a payment pointer
 */
export function urlToPaymentPointer(url: string): string {
  if (!url) {
    throw new Error('URL is required');
  }

  // Already a payment pointer
  if (url.startsWith('$')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;

    // Remove well-known prefix
    if (path.startsWith(WELL_KNOWN_PAY)) {
      path = path.substring(WELL_KNOWN_PAY.length);
    }

    // Remove trailing slash
    if (path.endsWith('/') && path.length > 1) {
      path = path.substring(0, path.length - 1);
    }

    return `$${urlObj.host}${path}`;
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Resolve a payment pointer to full details
 */
export function resolvePaymentPointer(pointer: string): ResolvedPaymentPointer {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer');
  }

  return {
    url: paymentPointerToUrl(pointer),
    host: parsed.host,
    path: parsed.path,
    original: pointer,
  };
}

/**
 * Normalize a payment pointer to consistent format
 */
export function normalizePaymentPointer(pointer: string): string {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer');
  }

  // Always return in $host/path format
  return `$${parsed.host}${parsed.path}`;
}

/**
 * Get the host from a payment pointer
 */
export function getPaymentPointerHost(pointer: string): string {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer');
  }
  return parsed.host;
}

/**
 * Get the path from a payment pointer
 */
export function getPaymentPointerPath(pointer: string): string {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer');
  }
  return parsed.path;
}

/**
 * Get the SPSP endpoint URL for a payment pointer
 */
export function getSpspEndpoint(pointer: string): string {
  return paymentPointerToUrl(pointer);
}

/**
 * Get the wallet address URL for Open Payments
 */
export function getWalletAddressUrl(pointer: string): string {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed) {
    throw new Error('Invalid payment pointer');
  }

  // For Open Payments, the wallet address URL is just https://host/path
  // without the /.well-known/pay prefix
  return `https://${parsed.host}${parsed.path}`;
}

/**
 * Create a payment pointer from components
 */
export function createPaymentPointer(host: string, path?: string): string {
  if (!host) {
    throw new Error('Host is required');
  }

  // Clean host
  let cleanHost = host.toLowerCase().trim();
  if (cleanHost.startsWith('https://')) {
    cleanHost = cleanHost.substring(8);
  }
  if (cleanHost.startsWith('http://')) {
    cleanHost = cleanHost.substring(7);
  }

  // Remove trailing slash from host
  if (cleanHost.endsWith('/')) {
    cleanHost = cleanHost.substring(0, cleanHost.length - 1);
  }

  // Clean path
  let cleanPath = path ?? '';
  if (cleanPath && !cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Remove trailing slash from path
  if (cleanPath.endsWith('/') && cleanPath.length > 1) {
    cleanPath = cleanPath.substring(0, cleanPath.length - 1);
  }

  return `$${cleanHost}${cleanPath}`;
}

/**
 * Check if two payment pointers refer to the same wallet
 */
export function isSameWallet(pointer1: string, pointer2: string): boolean {
  try {
    const normalized1 = normalizePaymentPointer(pointer1);
    const normalized2 = normalizePaymentPointer(pointer2);
    return normalized1.toLowerCase() === normalized2.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Extract username/account ID from payment pointer path
 */
export function extractAccountId(pointer: string): string | null {
  const parsed = parsePaymentPointer(pointer);
  if (!parsed || !parsed.path) {
    return null;
  }

  // Remove leading slash and get first segment
  const segments = parsed.path.substring(1).split('/');
  return segments[0] || null;
}

/**
 * Format payment pointer for display
 */
export function formatForDisplay(pointer: string): string {
  try {
    return normalizePaymentPointer(pointer);
  } catch {
    return pointer;
  }
}
