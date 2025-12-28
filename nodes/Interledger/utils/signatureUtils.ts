/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as crypto from 'crypto';

/**
 * HTTP Signature Utilities
 *
 * Open Payments uses HTTP Signatures for request authentication.
 * This follows the HTTP Message Signatures (RFC 9421) specification.
 *
 * Key concepts:
 * - Signature-Input: Describes what is being signed
 * - Signature: The actual cryptographic signature
 * - Content-Digest: Hash of request body (for POST/PUT)
 *
 * Uses Ed25519 keys (EdDSA algorithm).
 */

/**
 * Signature algorithm
 */
export const SIGNATURE_ALGORITHM = 'ed25519';

/**
 * Digest algorithm
 */
export const DIGEST_ALGORITHM = 'sha-512';

/**
 * HTTP Signature components
 */
export const SIGNATURE_COMPONENTS = {
  METHOD: '@method',
  TARGET_URI: '@target-uri',
  PATH: '@path',
  QUERY: '@query',
  AUTHORITY: '@authority',
  SCHEME: '@scheme',
  REQUEST_TARGET: '@request-target',
  CONTENT_TYPE: 'content-type',
  CONTENT_LENGTH: 'content-length',
  CONTENT_DIGEST: 'content-digest',
  AUTHORIZATION: 'authorization',
} as const;

/**
 * Signature parameters interface
 */
export interface SignatureParams {
  keyId: string;
  privateKey: string;
  publicKey?: string;
  algorithm?: string;
  created?: number;
  expires?: number;
  nonce?: string;
}

/**
 * Request details for signing
 */
export interface RequestDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | Buffer;
}

/**
 * Signature result
 */
export interface SignatureResult {
  signatureInput: string;
  signature: string;
  contentDigest?: string;
}

/**
 * Generate Ed25519 key pair
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
  };
}

/**
 * Create content digest from body
 */
export function createContentDigest(body: string | Buffer): string {
  const hash = crypto.createHash('sha512').update(body).digest('base64');
  return `sha-512=:${hash}:`;
}

/**
 * Build signature base string
 */
export function buildSignatureBase(
  components: string[],
  request: RequestDetails,
  params: SignatureParams,
): string {
  const lines: string[] = [];

  for (const component of components) {
    let value: string;

    switch (component) {
      case SIGNATURE_COMPONENTS.METHOD:
        value = request.method.toUpperCase();
        break;
      case SIGNATURE_COMPONENTS.TARGET_URI:
        value = request.url;
        break;
      case SIGNATURE_COMPONENTS.PATH: {
        const urlObj = new URL(request.url);
        value = urlObj.pathname;
        break;
      }
      case SIGNATURE_COMPONENTS.QUERY: {
        const urlObj = new URL(request.url);
        value = urlObj.search ? urlObj.search.substring(1) : '';
        break;
      }
      case SIGNATURE_COMPONENTS.AUTHORITY: {
        const urlObj = new URL(request.url);
        value = urlObj.host;
        break;
      }
      case SIGNATURE_COMPONENTS.SCHEME: {
        const urlObj = new URL(request.url);
        value = urlObj.protocol.replace(':', '');
        break;
      }
      default:
        // Regular header
        value = request.headers[component.toLowerCase()] ?? '';
    }

    lines.push(`"${component}": ${value}`);
  }

  // Add signature params line
  const paramsStr = buildSignatureParamsString(components, params);
  lines.push(`"@signature-params": ${paramsStr}`);

  return lines.join('\n');
}

/**
 * Build signature params string
 */
export function buildSignatureParamsString(
  components: string[],
  params: SignatureParams,
): string {
  const componentsList = components.map((c) => `"${c}"`).join(' ');
  const created = params.created ?? Math.floor(Date.now() / 1000);

  let paramsStr = `(${componentsList});keyid="${params.keyId}";alg="ed25519";created=${created}`;

  if (params.expires) {
    paramsStr += `;expires=${params.expires}`;
  }

  if (params.nonce) {
    paramsStr += `;nonce="${params.nonce}"`;
  }

  return paramsStr;
}

/**
 * Sign request with Ed25519
 */
export function signRequest(
  request: RequestDetails,
  params: SignatureParams,
): SignatureResult {
  // Define components to sign - explicitly typed as string[] to allow any component
  const components: string[] = [
    SIGNATURE_COMPONENTS.METHOD,
    SIGNATURE_COMPONENTS.TARGET_URI,
  ];

  const result: SignatureResult = {
    signatureInput: '',
    signature: '',
  };

  // Add content digest for requests with body
  if (request.body) {
    result.contentDigest = createContentDigest(request.body);
    request.headers['content-digest'] = result.contentDigest;
    components.push(SIGNATURE_COMPONENTS.CONTENT_DIGEST);
  }

  // Add content-type if present
  if (request.headers['content-type']) {
    components.push(SIGNATURE_COMPONENTS.CONTENT_TYPE);
  }

  // Build signature base
  const signatureBase = buildSignatureBase(components, request, params);

  // Create signature
  const privateKeyDer = Buffer.from(params.privateKey, 'base64');
  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: 'der',
    type: 'pkcs8',
  });

  const signature = crypto.sign(null, Buffer.from(signatureBase), privateKey);
  const signatureB64 = signature.toString('base64');

  // Build result
  result.signatureInput = `sig1=${buildSignatureParamsString(components, params)}`;
  result.signature = `sig1=:${signatureB64}:`;

  return result;
}

/**
 * Verify signature
 */
export function verifySignature(
  request: RequestDetails,
  signatureInput: string,
  signature: string,
  publicKey: string,
): boolean {
  try {
    // Parse signature input
    const match = signatureInput.match(/sig1=\(([^)]+)\);(.+)/);
    if (!match) return false;

    const componentsList = match[1];
    const components = componentsList
      .split(' ')
      .map((c) => c.replace(/"/g, ''));

    // Parse params
    const paramsStr = match[2];
    const keyIdMatch = paramsStr.match(/keyid="([^"]+)"/);
    const createdMatch = paramsStr.match(/created=(\d+)/);

    if (!keyIdMatch) return false;

    const params: SignatureParams = {
      keyId: keyIdMatch[1],
      privateKey: '', // Not needed for verification
      created: createdMatch ? parseInt(createdMatch[1], 10) : undefined,
    };

    // Rebuild signature base
    const signatureBase = buildSignatureBase(components, request, params);

    // Extract signature value
    const sigMatch = signature.match(/sig1=:([^:]+):/);
    if (!sigMatch) return false;

    const signatureBytes = Buffer.from(sigMatch[1], 'base64');

    // Verify
    const publicKeyDer = Buffer.from(publicKey, 'base64');
    const pubKey = crypto.createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, Buffer.from(signatureBase), pubKey, signatureBytes);
  } catch {
    return false;
  }
}

/**
 * Apply signature headers to request
 */
export function applySignatureHeaders(
  headers: Record<string, string>,
  signature: SignatureResult,
): Record<string, string> {
  const newHeaders = { ...headers };

  newHeaders['Signature-Input'] = signature.signatureInput;
  newHeaders['Signature'] = signature.signature;

  if (signature.contentDigest) {
    newHeaders['Content-Digest'] = signature.contentDigest;
  }

  return newHeaders;
}

/**
 * Create signed request headers
 */
export function createSignedHeaders(
  request: RequestDetails,
  params: SignatureParams,
): Record<string, string> {
  const signature = signRequest(request, params);
  return applySignatureHeaders(request.headers, signature);
}

/**
 * Hash data with SHA-256
 */
export function sha256(data: string | Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * HMAC-SHA256 for webhook signature verification
 */
export function hmacSha256(data: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Hash data with SHA-512
 */
export function sha512(data: string | Buffer): Buffer {
  return crypto.createHash('sha512').update(data).digest();
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate random nonce
 */
export function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Base64 URL encode
 */
export function base64UrlEncode(data: Buffer | string): string {
  const base64 = Buffer.isBuffer(data)
    ? data.toString('base64')
    : Buffer.from(data).toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL decode
 */
export function base64UrlDecode(data: string): Buffer {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  return Buffer.from(base64, 'base64');
}
