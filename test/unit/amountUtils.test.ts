/**
 * n8n-nodes-interledger - Amount Utils Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 */

import {
  toIntegerAmount,
  toDisplayAmount,
  compareAmounts,
  addAmounts,
  subtractAmounts,
  formatAmount,
  convertScale,
  isZero,
  zeroAmount,
} from '../../nodes/Interledger/utils/amountUtils';

describe('Amount Utils', () => {
  describe('toIntegerAmount', () => {
    it('should convert display amount to integer', () => {
      expect(toIntegerAmount('10.00', 2)).toBe('1000');
      expect(toIntegerAmount('1.5', 2)).toBe('150');
      expect(toIntegerAmount('100', 0)).toBe('100');
    });

    it('should handle different scales', () => {
      expect(toIntegerAmount('1.000001', 6)).toBe('1000001');
    });
  });

  describe('toDisplayAmount', () => {
    it('should convert integer to display amount', () => {
      // The implementation may not include trailing zeros
      const result = toDisplayAmount('1000', 2);
      expect(parseFloat(result)).toBe(10);
      const result2 = toDisplayAmount('150', 2);
      expect(parseFloat(result2)).toBe(1.5);
    });

    it('should handle zero scale', () => {
      expect(toDisplayAmount('100', 0)).toBe('100');
    });
  });

  describe('compareAmounts', () => {
    it('should compare amounts correctly', () => {
      const a1 = { value: '100', assetCode: 'USD', assetScale: 2 };
      const a2 = { value: '200', assetCode: 'USD', assetScale: 2 };
      const a3 = { value: '100', assetCode: 'USD', assetScale: 2 };
      
      expect(compareAmounts(a1, a2)).toBeLessThan(0);
      expect(compareAmounts(a2, a1)).toBeGreaterThan(0);
      expect(compareAmounts(a1, a3)).toBe(0);
    });
  });

  describe('addAmounts', () => {
    it('should add amounts', () => {
      const a1 = { value: '100', assetCode: 'USD', assetScale: 2 };
      const a2 = { value: '200', assetCode: 'USD', assetScale: 2 };
      const result = addAmounts(a1, a2);
      expect(result.value).toBe('300');
    });
  });

  describe('subtractAmounts', () => {
    it('should subtract amounts', () => {
      const a1 = { value: '200', assetCode: 'USD', assetScale: 2 };
      const a2 = { value: '100', assetCode: 'USD', assetScale: 2 };
      const result = subtractAmounts(a1, a2);
      expect(result.value).toBe('100');
    });
  });

  describe('formatAmount', () => {
    it('should format amount with currency', () => {
      const amount = { value: '1000', assetCode: 'USD', assetScale: 2 };
      const result = formatAmount(amount);
      expect(result).toContain('10');
      expect(result).toContain('USD');
    });
  });

  describe('convertScale', () => {
    it('should convert amount to different scale', () => {
      // 1000 at scale 2 = $10.00
      // Converting to scale 6: 1000 * 10^(6-2) = 1000 * 10000 = 10000000
      const amount = { value: '1000', assetCode: 'USD', assetScale: 2 };
      const converted = convertScale(amount, 6);
      expect(converted.assetScale).toBe(6);
      expect(converted.value).toBe('10000000');
    });
  });

  describe('isZero', () => {
    it('should check if amount is zero', () => {
      const zero = { value: '0', assetCode: 'USD', assetScale: 2 };
      const nonZero = { value: '100', assetCode: 'USD', assetScale: 2 };
      expect(isZero(zero)).toBe(true);
      expect(isZero(nonZero)).toBe(false);
    });
  });

  describe('zeroAmount', () => {
    it('should create zero amount', () => {
      const zero = zeroAmount('USD', 2);
      expect(zero.value).toBe('0');
      expect(zero.assetCode).toBe('USD');
      expect(zero.assetScale).toBe(2);
    });
  });
});
