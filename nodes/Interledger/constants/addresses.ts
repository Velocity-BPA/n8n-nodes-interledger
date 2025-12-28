/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * ILP Address Constants
 *
 * ILP addresses follow a hierarchical structure similar to IP addresses.
 * They identify accounts on the Interledger network.
 *
 * Format: allocation-scheme.connector.account
 * Example: g.example.alice
 *
 * Allocation Schemes:
 * - g. (global) - Live network addresses
 * - private. - Private/local network
 * - example. - Examples/documentation
 * - test. - Test network
 * - local. - Local development
 * - self. - Loopback/self
 * - peer. - Peer connections
 */

/**
 * ILP Address Prefixes
 */
export const ILP_ADDRESS_PREFIXES = {
  /** Global/production network */
  GLOBAL: 'g.',
  /** Private networks */
  PRIVATE: 'private.',
  /** Example/documentation addresses */
  EXAMPLE: 'example.',
  /** Test network */
  TEST: 'test.',
  /** Local development */
  LOCAL: 'local.',
  /** Self/loopback */
  SELF: 'self.',
  /** Peer connections */
  PEER: 'peer.',
} as const;

/**
 * Well-known ILP addresses
 */
export const WELL_KNOWN_ADDRESSES = {
  /** Null address - used for testing */
  NULL: 'test.null',
  /** Echo address - echoes packets back */
  ECHO: 'test.echo',
  /** Example sender */
  EXAMPLE_SENDER: 'example.sender',
  /** Example receiver */
  EXAMPLE_RECEIVER: 'example.receiver',
} as const;

/**
 * Address validation patterns
 */
export const ADDRESS_PATTERNS = {
  /** Valid ILP address characters */
  VALID_CHARS: /^[a-zA-Z0-9._~-]+$/,
  /** Maximum address length */
  MAX_LENGTH: 1023,
  /** Segment separator */
  SEPARATOR: '.',
  /** Minimum segments */
  MIN_SEGMENTS: 2,
} as const;

/**
 * Known connector addresses
 */
export const KNOWN_CONNECTORS = {
  /** Rafiki default */
  RAFIKI: {
    testnet: 'test.rafiki',
    mainnet: 'g.rafiki',
  },
  /** Coil */
  COIL: {
    mainnet: 'g.coil',
  },
  /** Gatehub */
  GATEHUB: {
    mainnet: 'g.gatehub',
  },
} as const;

/**
 * Payment pointer patterns
 */
export const PAYMENT_POINTER_PATTERNS = {
  /** Standard payment pointer format */
  STANDARD: /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9._~-]+)*$/,
  /** URL format */
  URL: /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9._~-]+)*$/,
  /** Well-known path */
  WELL_KNOWN_PATH: '/.well-known/pay',
} as const;

/**
 * Validate ILP address format
 */
export function isValidIlpAddress(address: string): boolean {
  if (!address || address.length > ADDRESS_PATTERNS.MAX_LENGTH) {
    return false;
  }

  if (!ADDRESS_PATTERNS.VALID_CHARS.test(address)) {
    return false;
  }

  const segments = address.split(ADDRESS_PATTERNS.SEPARATOR);
  if (segments.length < ADDRESS_PATTERNS.MIN_SEGMENTS) {
    return false;
  }

  return segments.every((seg) => seg.length > 0);
}

/**
 * Get address prefix/scheme
 */
export function getAddressPrefix(address: string): string | null {
  const dotIndex = address.indexOf('.');
  if (dotIndex === -1) return null;
  return address.substring(0, dotIndex + 1);
}

/**
 * Check if address is on global network
 */
export function isGlobalAddress(address: string): boolean {
  return address.startsWith(ILP_ADDRESS_PREFIXES.GLOBAL);
}

/**
 * Check if address is for testing
 */
export function isTestAddress(address: string): boolean {
  return (
    address.startsWith(ILP_ADDRESS_PREFIXES.TEST) ||
    address.startsWith(ILP_ADDRESS_PREFIXES.EXAMPLE) ||
    address.startsWith(ILP_ADDRESS_PREFIXES.LOCAL)
  );
}

/**
 * Convert payment pointer to URL
 */
export function paymentPointerToUrl(pointer: string): string {
  if (pointer.startsWith('https://')) {
    return pointer;
  }

  if (pointer.startsWith('$')) {
    const withoutDollar = pointer.substring(1);
    const slashIndex = withoutDollar.indexOf('/');

    if (slashIndex === -1) {
      return `https://${withoutDollar}${PAYMENT_POINTER_PATTERNS.WELL_KNOWN_PATH}`;
    }

    const host = withoutDollar.substring(0, slashIndex);
    const path = withoutDollar.substring(slashIndex);
    return `https://${host}${PAYMENT_POINTER_PATTERNS.WELL_KNOWN_PATH}${path}`;
  }

  throw new Error(`Invalid payment pointer format: ${pointer}`);
}

/**
 * Convert URL to payment pointer
 */
export function urlToPaymentPointer(url: string): string {
  if (url.startsWith('$')) {
    return url;
  }

  const urlObj = new URL(url);
  let path = urlObj.pathname;

  if (path.startsWith(PAYMENT_POINTER_PATTERNS.WELL_KNOWN_PATH)) {
    path = path.substring(PAYMENT_POINTER_PATTERNS.WELL_KNOWN_PATH.length);
  }

  return `$${urlObj.host}${path}`;
}
