/**
 * n8n-nodes-interledger - Constants Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 */

import {
  ILP_ADDRESS_PREFIXES,
  WELL_KNOWN_ADDRESSES,
  ADDRESS_PATTERNS,
  isValidIlpAddress,
  isGlobalAddress,
  isTestAddress,
} from '../../nodes/Interledger/constants/addresses';

import {
  FIAT_ASSETS,
  CRYPTO_ASSETS,
} from '../../nodes/Interledger/constants/assets';

import {
  ILP_ERROR_CODES,
  FINAL_ERRORS,
  TEMPORARY_ERRORS,
} from '../../nodes/Interledger/constants/errorCodes';

import {
  ACCESS_TYPES,
  ACCESS_ACTIONS,
  GRANT_STATES,
} from '../../nodes/Interledger/constants/grantTypes';

import {
  ILP_PACKET_TYPES,
} from '../../nodes/Interledger/constants/packetTypes';

describe('Constants', () => {
  describe('ILP Addresses', () => {
    it('should have ILP address prefixes', () => {
      expect(ILP_ADDRESS_PREFIXES).toBeDefined();
      expect(ILP_ADDRESS_PREFIXES.GLOBAL).toBe('g.');
      expect(ILP_ADDRESS_PREFIXES.TEST).toBe('test.');
      expect(ILP_ADDRESS_PREFIXES.PRIVATE).toBe('private.');
    });

    it('should have well known addresses', () => {
      expect(WELL_KNOWN_ADDRESSES).toBeDefined();
    });

    it('should have address patterns', () => {
      expect(ADDRESS_PATTERNS).toBeDefined();
    });

    it('should validate ILP addresses', () => {
      expect(isValidIlpAddress('g.example.alice')).toBe(true);
      expect(isValidIlpAddress('test.example.bob')).toBe(true);
      expect(isValidIlpAddress('invalid')).toBe(false);
    });

    it('should check global addresses', () => {
      expect(isGlobalAddress('g.example.alice')).toBe(true);
      expect(isGlobalAddress('test.example.bob')).toBe(false);
    });

    it('should check test addresses', () => {
      expect(isTestAddress('test.example.bob')).toBe(true);
      expect(isTestAddress('g.example.alice')).toBe(false);
    });
  });

  describe('Assets', () => {
    it('should have fiat assets', () => {
      expect(FIAT_ASSETS).toBeDefined();
      expect(FIAT_ASSETS.USD).toBeDefined();
      expect(FIAT_ASSETS.USD.code).toBe('USD');
      expect(FIAT_ASSETS.USD.scale).toBe(2);
    });

    it('should have crypto assets', () => {
      expect(CRYPTO_ASSETS).toBeDefined();
      expect(CRYPTO_ASSETS.XRP).toBeDefined();
      expect(CRYPTO_ASSETS.XRP.code).toBe('XRP');
    });
  });

  describe('Error Codes', () => {
    it('should have ILP error codes', () => {
      expect(ILP_ERROR_CODES).toBeDefined();
      expect(ILP_ERROR_CODES.F00_BAD_REQUEST).toBe('F00');
      expect(ILP_ERROR_CODES.T00_INTERNAL_ERROR).toBe('T00');
      expect(ILP_ERROR_CODES.R00_TRANSFER_TIMED_OUT).toBe('R00');
    });

    it('should have final errors', () => {
      expect(FINAL_ERRORS).toBeDefined();
    });

    it('should have temporary errors', () => {
      expect(TEMPORARY_ERRORS).toBeDefined();
    });
  });

  describe('Grant Types', () => {
    it('should have access types', () => {
      expect(ACCESS_TYPES).toBeDefined();
      expect(ACCESS_TYPES.INCOMING_PAYMENT).toBe('incoming-payment');
      expect(ACCESS_TYPES.OUTGOING_PAYMENT).toBe('outgoing-payment');
      expect(ACCESS_TYPES.QUOTE).toBe('quote');
    });

    it('should have access actions', () => {
      expect(ACCESS_ACTIONS).toBeDefined();
      expect(ACCESS_ACTIONS.CREATE).toBe('create');
      expect(ACCESS_ACTIONS.READ).toBe('read');
      expect(ACCESS_ACTIONS.LIST).toBe('list');
    });

    it('should have grant states', () => {
      expect(GRANT_STATES).toBeDefined();
      expect(GRANT_STATES.PENDING).toBe('pending');
      expect(GRANT_STATES.APPROVED).toBe('approved');
    });
  });

  describe('Packet Types', () => {
    it('should have ILP packet types', () => {
      expect(ILP_PACKET_TYPES).toBeDefined();
      expect(ILP_PACKET_TYPES.PREPARE).toBe(12);
      expect(ILP_PACKET_TYPES.FULFILL).toBe(13);
      expect(ILP_PACKET_TYPES.REJECT).toBe(14);
    });
  });
});
