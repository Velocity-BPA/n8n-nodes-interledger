/**
 * n8n-nodes-interledger - Packet Utils Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 */

import {
  createPreparePacket,
  createFulfillPacket,
  createRejectPacket,
  generateFulfillment,
  generateConditionFromFulfillment,
  generateConditionAndFulfillment,
  generateCondition,
  verifyCondition,
  serializePacket,
  deserializePacket,
  validatePrepare,
} from '../../nodes/Interledger/utils/packetUtils';

describe('Packet Utils', () => {
  describe('createPreparePacket', () => {
    it('should create a prepare packet with required fields', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      
      const packet = createPreparePacket({
        amount: '1000',
        destination: 'g.example.alice',
        executionCondition: condition,
      });

      expect(packet).toBeDefined();
      expect(packet.amount).toBe('1000');
      expect(packet.destination).toBe('g.example.alice');
    });

    it('should create a prepare packet with data', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      
      const packet = createPreparePacket({
        amount: '500',
        destination: 'g.example.bob',
        executionCondition: condition,
        data: Buffer.from('test data'),
      });

      expect(packet.data).toBeDefined();
    });
  });

  describe('createFulfillPacket', () => {
    it('should create a fulfill packet', () => {
      const fulfillment = generateFulfillment();
      
      const packet = createFulfillPacket({
        fulfillment,
      });

      expect(packet).toBeDefined();
      expect(packet.fulfillment).toEqual(fulfillment);
    });
  });

  describe('createRejectPacket', () => {
    it('should create a reject packet', () => {
      const packet = createRejectPacket({
        code: 'F00',
        message: 'Bad Request',
        triggeredBy: 'g.example.connector',
      });

      expect(packet).toBeDefined();
      expect(packet.code).toBe('F00');
      expect(packet.message).toBe('Bad Request');
    });
  });

  describe('generateFulfillment', () => {
    it('should generate a 32-byte fulfillment', () => {
      const fulfillment = generateFulfillment();
      expect(Buffer.isBuffer(fulfillment)).toBe(true);
      expect(fulfillment.length).toBe(32);
    });

    it('should generate unique fulfillments', () => {
      const f1 = generateFulfillment();
      const f2 = generateFulfillment();
      expect(f1.equals(f2)).toBe(false);
    });
  });

  describe('generateConditionFromFulfillment', () => {
    it('should generate a 32-byte condition from fulfillment', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      expect(Buffer.isBuffer(condition)).toBe(true);
      expect(condition.length).toBe(32);
    });

    it('should generate consistent conditions', () => {
      const fulfillment = generateFulfillment();
      const c1 = generateConditionFromFulfillment(fulfillment);
      const c2 = generateConditionFromFulfillment(fulfillment);
      expect(c1.equals(c2)).toBe(true);
    });
  });

  describe('generateConditionAndFulfillment', () => {
    it('should generate both condition and fulfillment', () => {
      const { condition, fulfillment } = generateConditionAndFulfillment();
      expect(Buffer.isBuffer(condition)).toBe(true);
      expect(Buffer.isBuffer(fulfillment)).toBe(true);
      expect(condition.length).toBe(32);
      expect(fulfillment.length).toBe(32);
    });
  });

  describe('generateCondition', () => {
    it('should generate a random condition', () => {
      const condition = generateCondition();
      expect(Buffer.isBuffer(condition)).toBe(true);
      expect(condition.length).toBe(32);
    });
  });

  describe('verifyCondition', () => {
    it('should verify matching condition and fulfillment', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      expect(verifyCondition(condition, fulfillment)).toBe(true);
    });

    it('should reject mismatched condition and fulfillment', () => {
      const fulfillment1 = generateFulfillment();
      const fulfillment2 = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment1);
      expect(verifyCondition(condition, fulfillment2)).toBe(false);
    });
  });

  describe('serializePacket and deserializePacket', () => {
    it('should serialize and deserialize a prepare packet', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      
      const original = createPreparePacket({
        amount: '1000',
        destination: 'g.example.alice',
        executionCondition: condition,
      });

      const serialized = serializePacket(original);
      expect(Buffer.isBuffer(serialized)).toBe(true);

      const deserialized = deserializePacket(serialized);
      expect(deserialized).toBeDefined();
    });
  });

  describe('validatePrepare', () => {
    it('should validate a well-formed prepare packet', () => {
      const fulfillment = generateFulfillment();
      const condition = generateConditionFromFulfillment(fulfillment);
      
      const packet = createPreparePacket({
        amount: '1000',
        destination: 'g.example.alice',
        executionCondition: condition,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = validatePrepare(packet);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
