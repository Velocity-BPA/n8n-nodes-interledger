/**
 * n8n-nodes-interledger - Jest Test Setup
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

// Export to make this a module (required for declare global)
export {};

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock crypto for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => crypto.randomBytes(arr.length),
      subtle: crypto.webcrypto?.subtle,
      randomUUID: () => crypto.randomUUID(),
    },
  });
}

// Suppress console.warn for licensing notices during tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Velocity BPA Licensing Notice')) {
    return; // Suppress licensing notices in tests
  }
  originalWarn.apply(console, args);
};

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        generateMockKeyPair: () => { publicKey: string; privateKey: string };
        generateMockPaymentPointer: () => string;
        generateMockIlpAddress: () => string;
        generateMockAmount: (scale?: number) => { value: string; assetCode: string; assetScale: number };
      };
    }
  }
}

// Test utility functions
(global as any).testUtils = {
  generateMockKeyPair: () => ({
    publicKey: 'test-public-key-' + Math.random().toString(36).substring(7),
    privateKey: 'test-private-key-' + Math.random().toString(36).substring(7),
  }),
  
  generateMockPaymentPointer: () => {
    const domains = ['wallet.example.com', 'pay.test.org', 'ilp.demo.net'];
    const users = ['alice', 'bob', 'charlie', 'merchant'];
    return `$${domains[Math.floor(Math.random() * domains.length)]}/${users[Math.floor(Math.random() * users.length)]}`;
  },
  
  generateMockIlpAddress: () => {
    const prefixes = ['g.', 'test.', 'private.'];
    const connectors = ['connector1', 'hub', 'peer'];
    const accounts = ['alice', 'bob', 'charlie'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${connectors[Math.floor(Math.random() * connectors.length)]}.${accounts[Math.floor(Math.random() * accounts.length)]}`;
  },
  
  generateMockAmount: (scale = 2) => ({
    value: String(Math.floor(Math.random() * 100000)),
    assetCode: ['USD', 'EUR', 'XRP'][Math.floor(Math.random() * 3)],
    assetScale: scale,
  }),
};

// Clean up after all tests
afterAll(() => {
  console.warn = originalWarn;
});
