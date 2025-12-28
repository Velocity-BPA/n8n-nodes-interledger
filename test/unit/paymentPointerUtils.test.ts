/**
 * n8n-nodes-interledger - Payment Pointer Utils Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 */

import {
  isValidPaymentPointer,
  parsePaymentPointer,
  paymentPointerToUrl,
  urlToPaymentPointer,
  getPaymentPointerHost,
  getPaymentPointerPath,
  createPaymentPointer,
  isSameWallet,
} from '../../nodes/Interledger/utils/paymentPointerUtils';

describe('Payment Pointer Utils', () => {
  describe('isValidPaymentPointer', () => {
    it('should validate correct payment pointers', () => {
      expect(isValidPaymentPointer('$wallet.example.com/alice')).toBe(true);
      expect(isValidPaymentPointer('$pay.example.org/user123')).toBe(true);
      expect(isValidPaymentPointer('$wallet.example.com')).toBe(true);
    });

    it('should reject invalid payment pointers', () => {
      expect(isValidPaymentPointer('invalid')).toBe(false);
      expect(isValidPaymentPointer('wallet.example.com')).toBe(false);
      expect(isValidPaymentPointer('$')).toBe(false);
      expect(isValidPaymentPointer('')).toBe(false);
    });
  });

  describe('parsePaymentPointer', () => {
    it('should parse payment pointer with path', () => {
      const result = parsePaymentPointer('$wallet.example.com/alice');
      expect(result).not.toBeNull();
      expect(result?.host).toBe('wallet.example.com');
      expect(result?.path).toBe('/alice');
    });

    it('should parse payment pointer without path', () => {
      const result = parsePaymentPointer('$wallet.example.com');
      expect(result).not.toBeNull();
      expect(result?.host).toBe('wallet.example.com');
    });

    it('should handle nested paths', () => {
      const result = parsePaymentPointer('$wallet.example.com/users/alice');
      expect(result).not.toBeNull();
      expect(result?.path).toBe('/users/alice');
    });

    it('should return null for invalid pointer', () => {
      const result = parsePaymentPointer('invalid');
      expect(result).toBeNull();
    });
  });

  describe('paymentPointerToUrl', () => {
    it('should convert payment pointer to HTTPS URL', () => {
      const url = paymentPointerToUrl('$wallet.example.com/alice');
      expect(url).toContain('https://');
      expect(url).toContain('wallet.example.com');
    });

    it('should handle payment pointer without path', () => {
      const url = paymentPointerToUrl('$wallet.example.com');
      expect(url).toContain('https://');
    });
  });

  describe('urlToPaymentPointer', () => {
    it('should convert URL to payment pointer', () => {
      const pointer = urlToPaymentPointer('https://wallet.example.com/.well-known/pay');
      expect(pointer).toContain('$');
    });
  });

  describe('getPaymentPointerHost', () => {
    it('should extract host from payment pointer', () => {
      const host = getPaymentPointerHost('$wallet.example.com/alice');
      expect(host).toBe('wallet.example.com');
    });

    it('should handle subdomain hosts', () => {
      const host = getPaymentPointerHost('$pay.sub.example.com/user');
      expect(host).toBe('pay.sub.example.com');
    });
  });

  describe('getPaymentPointerPath', () => {
    it('should extract path from payment pointer', () => {
      const path = getPaymentPointerPath('$wallet.example.com/alice');
      expect(path).toBe('/alice');
    });

    it('should handle complex paths', () => {
      const path = getPaymentPointerPath('$wallet.example.com/users/alice/account');
      expect(path).toBe('/users/alice/account');
    });
  });

  describe('createPaymentPointer', () => {
    it('should create payment pointer from host and path', () => {
      const pointer = createPaymentPointer('wallet.example.com', 'alice');
      expect(pointer).toBe('$wallet.example.com/alice');
    });

    it('should create payment pointer from host only', () => {
      const pointer = createPaymentPointer('wallet.example.com');
      expect(pointer).toBe('$wallet.example.com');
    });
  });

  describe('isSameWallet', () => {
    it('should identify same wallet pointer', () => {
      expect(isSameWallet('$wallet.example.com/alice', '$wallet.example.com/alice')).toBe(true);
    });

    it('should identify different wallets', () => {
      expect(isSameWallet('$wallet.example.com/alice', '$other.example.com/alice')).toBe(false);
    });
  });
});
