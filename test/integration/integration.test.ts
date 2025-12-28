/**
 * n8n-nodes-interledger - Integration Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * 
 * These tests verify integration between components without requiring
 * external network connections.
 */

import { isValidPaymentPointer, paymentPointerToUrl, parsePaymentPointer } from '../../nodes/Interledger/utils/paymentPointerUtils';
import { toIntegerAmount, toDisplayAmount, convertScale } from '../../nodes/Interledger/utils/amountUtils';
import { generateKeyPair, sha256 } from '../../nodes/Interledger/utils/signatureUtils';
import { createPreparePacket, generateConditionAndFulfillment, serializePacket, deserializePacket, verifyCondition } from '../../nodes/Interledger/utils/packetUtils';
import { FIAT_ASSETS, CRYPTO_ASSETS } from '../../nodes/Interledger/constants/assets';
import { ILP_ERROR_CODES } from '../../nodes/Interledger/constants/errorCodes';

describe('Integration Tests', () => {
  describe('Payment Pointer to ILP Packet Flow', () => {
    it('should process payment pointer and create ILP packet', () => {
      // Step 1: Validate and parse payment pointer
      const pointer = '$wallet.example.com/alice';
      expect(isValidPaymentPointer(pointer)).toBe(true);
      
      const parsed = parsePaymentPointer(pointer);
      expect(parsed).not.toBeNull();
      expect(parsed?.host).toBe('wallet.example.com');
      
      // Step 2: Convert to URL
      const url = paymentPointerToUrl(pointer);
      expect(url).toContain('https://');
      
      // Step 3: Create ILP packet for payment
      const { condition, fulfillment } = generateConditionAndFulfillment();
      
      const packet = createPreparePacket({
        amount: '1000',
        destination: 'g.wallet.example.alice',
        executionCondition: condition,
      });
      
      expect(packet.amount).toBe('1000');
      
      // Step 4: Serialize and deserialize
      const serialized = serializePacket(packet);
      const deserialized = deserializePacket(serialized);
      expect(deserialized).toBeDefined();
      
      // Step 5: Verify condition/fulfillment pair
      expect(verifyCondition(condition, fulfillment)).toBe(true);
    });
  });

  describe('Amount Conversion Flow', () => {
    it('should convert amounts between different asset scales', () => {
      // USD amount: $10.00 with scale 2
      const usdDisplayAmount = '10.00';
      const usdScale = FIAT_ASSETS.USD.scale;
      
      // Convert to integer
      const usdIntAmount = toIntegerAmount(usdDisplayAmount, usdScale);
      expect(usdIntAmount).toBe('1000');
      
      // Convert back to display (may not have trailing zeros)
      const displayBack = toDisplayAmount(usdIntAmount, usdScale);
      expect(parseFloat(displayBack)).toBe(10);
      
      // Scale to XRP scale (6) using convertScale
      // 1000 at scale 2 -> scale 6 = 1000 * 10^4 = 10000000
      const usdAmount = { value: usdIntAmount, assetCode: 'USD', assetScale: usdScale };
      const xrpScale = CRYPTO_ASSETS.XRP.scale;
      const scaledAmount = convertScale(usdAmount, xrpScale);
      expect(scaledAmount.value).toBe('10000000');
    });
  });

  describe('Key Generation and Signing Flow', () => {
    it('should generate keys and create hashes', () => {
      // Generate key pair
      const keyPair = generateKeyPair();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      
      // Create hash of data
      const data = 'payment data';
      const hash = sha256(data);
      expect(Buffer.isBuffer(hash)).toBe(true);
      expect(hash.length).toBe(32);
      
      // Hash is deterministic
      const hash2 = sha256(data);
      expect(hash.equals(hash2)).toBe(true);
    });
  });

  describe('Error Code Handling', () => {
    it('should use correct error codes for different scenarios', () => {
      // Check that error codes are properly categorized
      expect(ILP_ERROR_CODES.F00_BAD_REQUEST).toBe('F00');
      expect(ILP_ERROR_CODES.T00_INTERNAL_ERROR).toBe('T00');
      expect(ILP_ERROR_CODES.R00_TRANSFER_TIMED_OUT).toBe('R00');
      
      // Final errors start with F
      expect(ILP_ERROR_CODES.F00_BAD_REQUEST.startsWith('F')).toBe(true);
      
      // Temporary errors start with T
      expect(ILP_ERROR_CODES.T00_INTERNAL_ERROR.startsWith('T')).toBe(true);
      
      // Relative errors start with R
      expect(ILP_ERROR_CODES.R00_TRANSFER_TIMED_OUT.startsWith('R')).toBe(true);
    });
  });

  describe('Multi-Asset Payment Flow', () => {
    it('should handle multi-currency amount conversions', () => {
      // Source: USD $100.00
      const usdAmount = toIntegerAmount('100.00', 2);
      expect(usdAmount).toBe('10000');
      
      // Create Amount object and scale to EUR (same scale)
      const usdAmountObj = { value: usdAmount, assetCode: 'USD', assetScale: 2 };
      const eurAmount = convertScale(usdAmountObj, 2);
      expect(eurAmount.value).toBe('10000');
      
      // Scale to XRP (scale 6)
      // 10000 at scale 2 -> scale 6 = 10000 * 10^4 = 100000000
      const xrpAmount = convertScale(usdAmountObj, 6);
      expect(xrpAmount.value).toBe('100000000');
      
      // Display XRP amount: 100000000 at scale 6 = 100.0
      const xrpDisplay = toDisplayAmount(xrpAmount.value, 6);
      expect(parseFloat(xrpDisplay)).toBe(100);
    });
  });
});
