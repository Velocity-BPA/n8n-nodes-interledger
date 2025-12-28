/**
 * n8n-nodes-interledger - Signature Utils Tests
 * 
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 */

import {
  generateKeyPair,
  createContentDigest,
  sha256,
  sha512,
  randomBytes,
  generateNonce,
  base64UrlEncode,
  base64UrlDecode,
  SIGNATURE_ALGORITHM,
  DIGEST_ALGORITHM,
} from '../../nodes/Interledger/utils/signatureUtils';

describe('Signature Utils', () => {
  describe('generateKeyPair', () => {
    it('should generate a key pair', () => {
      const keyPair = generateKeyPair();
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.privateKey).toBe('string');
    });

    it('should generate unique key pairs', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('createContentDigest', () => {
    it('should create digest for string content', () => {
      const digest = createContentDigest('test content');
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(0);
    });

    it('should create consistent digests', () => {
      const digest1 = createContentDigest('same content');
      const digest2 = createContentDigest('same content');
      expect(digest1).toBe(digest2);
    });

    it('should create different digests for different content', () => {
      const digest1 = createContentDigest('content 1');
      const digest2 = createContentDigest('content 2');
      expect(digest1).not.toBe(digest2);
    });
  });

  describe('sha256', () => {
    it('should hash string data', () => {
      const hash = sha256('test');
      expect(Buffer.isBuffer(hash)).toBe(true);
      expect(hash.length).toBe(32);
    });

    it('should produce consistent hashes', () => {
      const hash1 = sha256('test');
      const hash2 = sha256('test');
      expect(hash1.equals(hash2)).toBe(true);
    });
  });

  describe('sha512', () => {
    it('should hash string data', () => {
      const hash = sha512('test');
      expect(Buffer.isBuffer(hash)).toBe(true);
      expect(hash.length).toBe(64);
    });
  });

  describe('randomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const bytes = randomBytes(16);
      expect(Buffer.isBuffer(bytes)).toBe(true);
      expect(bytes.length).toBe(16);
    });

    it('should generate different bytes each time', () => {
      const bytes1 = randomBytes(16);
      const bytes2 = randomBytes(16);
      expect(bytes1.equals(bytes2)).toBe(false);
    });
  });

  describe('generateNonce', () => {
    it('should generate nonce of default length', () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('base64UrlEncode', () => {
    it('should encode buffer to base64url', () => {
      const buffer = Buffer.from('test');
      const encoded = base64UrlEncode(buffer);
      expect(typeof encoded).toBe('string');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });

  describe('base64UrlDecode', () => {
    it('should decode base64url to buffer', () => {
      const original = Buffer.from('test');
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded.equals(original)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have correct signature algorithm', () => {
      expect(SIGNATURE_ALGORITHM).toBe('ed25519');
    });

    it('should have correct digest algorithm', () => {
      expect(DIGEST_ALGORITHM).toBe('sha-512');
    });
  });
});
