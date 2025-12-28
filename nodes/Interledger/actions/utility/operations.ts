/**
 * Utility Operations
 * Provides helper functions for working with ILP, payment pointers, and cryptography
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import {
	validatePaymentPointer,
	parsePaymentPointer,
	paymentPointerToUrl,
	urlToPaymentPointer,
} from '../../utils/paymentPointerUtils';
import { isValidIlpAddress, getAddressPrefix } from '../../constants/addresses';
import { toSmallestUnit, fromSmallestUnit, formatAmount } from '../../utils/amountUtils';
import { getAsset, ASSET_OPTIONS } from '../../constants/assets';
import { generateKeyPair, sha256, sha512, base64UrlEncode, base64UrlDecode } from '../../utils/signatureUtils';
import { ILP_VERSION, STREAM_VERSION, OPEN_PAYMENTS_VERSION, SPSP_VERSION } from '../../constants';

/**
 * Utility resource operations
 */
export const utilityOperations = {
	resource: 'utility',
	operations: [
		{ name: 'Validate Payment Pointer', value: 'validatePaymentPointer', description: 'Validate a payment pointer format' },
		{ name: 'Parse Payment Pointer', value: 'parsePaymentPointer', description: 'Parse a payment pointer into components' },
		{ name: 'Format ILP Address', value: 'formatIlpAddress', description: 'Format an ILP address from components' },
		{ name: 'Validate ILP Address', value: 'validateIlpAddress', description: 'Validate an ILP address format' },
		{ name: 'Convert Amount', value: 'convertAmount', description: 'Convert amount between scales' },
		{ name: 'Generate Key Pair', value: 'generateKeyPair', description: 'Generate an Ed25519 key pair' },
		{ name: 'Sign Data', value: 'signData', description: 'Sign data with a private key' },
		{ name: 'Verify Signature', value: 'verifySignature', description: 'Verify a signature' },
		{ name: 'Get Protocol Version', value: 'getProtocolVersion', description: 'Get protocol version information' },
	],
};

/**
 * Validate a payment pointer
 */
export async function validatePaymentPointerOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;

	const validation = validatePaymentPointer(paymentPointer);
	const parsed = parsePaymentPointer(paymentPointer);

	return [{
		json: {
			paymentPointer,
			valid: validation.valid,
			error: validation.error,
			host: parsed?.host,
			path: parsed?.path,
			url: validation.valid ? paymentPointerToUrl(paymentPointer) : null,
		},
	}];
}

/**
 * Parse a payment pointer
 */
export async function parsePaymentPointerOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const input = this.getNodeParameter('input', index) as string;
	const inputType = this.getNodeParameter('inputType', index, 'auto') as string;

	let result: Record<string, unknown>;

	if (inputType === 'url' || (inputType === 'auto' && input.startsWith('http'))) {
		// Convert URL to payment pointer
		const paymentPointer = urlToPaymentPointer(input);
		const parsed = parsePaymentPointer(paymentPointer);
		
		result = {
			inputType: 'url',
			input,
			paymentPointer,
			url: input,
			host: parsed?.host,
			path: parsed?.path,
		};
	} else {
		// Parse payment pointer
		const parsed = parsePaymentPointer(input);
		
		if (!parsed) {
			throw new NodeOperationError(this.getNode(), 'Invalid payment pointer format');
		}

		result = {
			inputType: 'paymentPointer',
			input,
			paymentPointer: input,
			url: paymentPointerToUrl(input),
			host: parsed.host,
			path: parsed.path,
		};
	}

	return [{ json: result }];
}

/**
 * Format an ILP address from components
 */
export async function formatIlpAddressOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const prefix = this.getNodeParameter('prefix', index) as string;
	const connector = this.getNodeParameter('connector', index) as string;
	const account = this.getNodeParameter('account', index, '') as string;
	const subAccount = this.getNodeParameter('subAccount', index, '') as string;

	// Validate prefix
	const validPrefixes = ['g', 'private', 'test', 'local', 'example', 'peer', 'self'];
	if (!validPrefixes.includes(prefix)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid prefix. Must be one of: ${validPrefixes.join(', ')}`,
		);
	}

	// Build ILP address
	let ilpAddress = `${prefix}.${connector}`;
	if (account) {
		ilpAddress += `.${account}`;
	}
	if (subAccount) {
		ilpAddress += `.${subAccount}`;
	}

	// Validate the resulting address
	const isValid = isValidIlpAddress(ilpAddress);

	return [{
		json: {
			ilpAddress,
			valid: isValid,
			components: {
				prefix,
				connector,
				account: account || null,
				subAccount: subAccount || null,
			},
			isGlobal: prefix === 'g',
			isTest: prefix === 'test',
			isPrivate: prefix === 'private',
		},
	}];
}

/**
 * Validate an ILP address
 */
export async function validateIlpAddressOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const ilpAddress = this.getNodeParameter('ilpAddress', index) as string;

	const isValid = isValidIlpAddress(ilpAddress);
	const prefix = getAddressPrefix(ilpAddress);
	const parts = ilpAddress.split('.');

	return [{
		json: {
			ilpAddress,
			valid: isValid,
			prefix,
			components: {
				allocationScheme: parts[0],
				connector: parts[1],
				account: parts[2] || null,
				remaining: parts.slice(3).join('.') || null,
			},
			isGlobal: prefix === 'g',
			isTest: prefix === 'test',
			isPrivate: prefix === 'private',
			maxLength: 1023,
			currentLength: ilpAddress.length,
		},
	}];
}

/**
 * Convert amount between scales
 */
export async function convertAmountOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const amount = this.getNodeParameter('amount', index) as string;
	const fromScale = this.getNodeParameter('fromScale', index) as number;
	const toScale = this.getNodeParameter('toScale', index) as number;
	const assetCode = this.getNodeParameter('assetCode', index, '') as string;

	// Convert between scales
	// If fromScale > toScale, we're going from smaller to larger units (divide)
	// If fromScale < toScale, we're going from larger to smaller units (multiply)
	const scaleDiff = toScale - fromScale;
	const factor = BigInt(10) ** BigInt(Math.abs(scaleDiff));
	
	const amountBigInt = BigInt(amount);
	let result: bigint;
	
	if (scaleDiff > 0) {
		result = amountBigInt * factor;
	} else if (scaleDiff < 0) {
		result = amountBigInt / factor;
	} else {
		result = amountBigInt;
	}

	// Get display value
	const displayValue = fromSmallestUnit(result.toString(), toScale);
	
	// Format with asset code if provided
	let formatted = displayValue;
	if (assetCode) {
		const asset = getAsset(assetCode);
		formatted = formatAmount({
			value: result.toString(),
			assetCode,
			assetScale: toScale,
		});
	}

	return [{
		json: {
			input: {
				amount,
				scale: fromScale,
			},
			output: {
				amount: result.toString(),
				scale: toScale,
				displayValue,
				formatted,
			},
			assetCode: assetCode || null,
			scaleDifference: scaleDiff,
		},
	}];
}

/**
 * Generate an Ed25519 key pair
 */
export async function generateKeyPairOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const format = this.getNodeParameter('format', index, 'base64url') as string;
	const includeJwk = this.getNodeParameter('includeJwk', index, true) as boolean;

	const keyPair = generateKeyPair();

	const result: Record<string, unknown> = {
		algorithm: 'Ed25519',
		keyId: `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
	};

	if (format === 'base64url') {
		result.publicKey = keyPair.publicKey;
		result.privateKey = keyPair.privateKey;
		result.format = 'base64url';
	} else if (format === 'hex') {
		result.publicKey = Buffer.from(keyPair.publicKey, 'base64').toString('hex');
		result.privateKey = Buffer.from(keyPair.privateKey, 'base64').toString('hex');
		result.format = 'hex';
	} else {
		result.publicKey = keyPair.publicKey;
		result.privateKey = keyPair.privateKey;
		result.format = 'base64';
	}

	if (includeJwk) {
		result.jwk = {
			kty: 'OKP',
			crv: 'Ed25519',
			x: keyPair.publicKey,
			// Note: d (private key) is included for convenience but should be stored securely
			d: keyPair.privateKey,
			use: 'sig',
			kid: result.keyId,
		};
	}

	result.usage = {
		openPayments: 'Use as client key for HTTP signature authentication',
		stream: 'Can be used for STREAM connection authentication',
	};

	return [{ json: result }];
}

/**
 * Sign data with a private key
 */
export async function signDataOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const data = this.getNodeParameter('data', index) as string;
	const privateKey = this.getNodeParameter('privateKey', index) as string;
	const algorithm = this.getNodeParameter('algorithm', index, 'ed25519') as string;
	const encoding = this.getNodeParameter('encoding', index, 'utf8') as string;

	const crypto = require('crypto');

	try {
		let signature: string;
		let dataBuffer: Buffer;

		// Prepare data
		if (encoding === 'base64') {
			dataBuffer = Buffer.from(data, 'base64');
		} else if (encoding === 'hex') {
			dataBuffer = Buffer.from(data, 'hex');
		} else {
			dataBuffer = Buffer.from(data, 'utf8');
		}

		if (algorithm === 'ed25519') {
			// Create Ed25519 private key
			const keyBuffer = Buffer.from(privateKey, 'base64');
			const key = crypto.createPrivateKey({
				key: keyBuffer,
				format: 'der',
				type: 'pkcs8',
			});

			signature = crypto.sign(null, dataBuffer, key).toString('base64url');
		} else if (algorithm === 'sha256') {
			// Simple HMAC-SHA256
			signature = sha256(data, privateKey);
		} else if (algorithm === 'sha512') {
			signature = sha512(data, privateKey);
		} else {
			throw new Error(`Unsupported algorithm: ${algorithm}`);
		}

		return [{
			json: {
				data,
				signature,
				algorithm,
				signedAt: new Date().toISOString(),
				dataHash: sha256(data),
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to sign data: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Verify a signature
 */
export async function verifySignatureOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const data = this.getNodeParameter('data', index) as string;
	const signature = this.getNodeParameter('signature', index) as string;
	const publicKey = this.getNodeParameter('publicKey', index) as string;
	const algorithm = this.getNodeParameter('algorithm', index, 'ed25519') as string;

	const crypto = require('crypto');

	try {
		let verified: boolean;

		if (algorithm === 'ed25519') {
			// Create Ed25519 public key
			const keyBuffer = Buffer.from(publicKey, 'base64');
			const key = crypto.createPublicKey({
				key: keyBuffer,
				format: 'der',
				type: 'spki',
			});

			const sigBuffer = Buffer.from(signature, 'base64url');
			const dataBuffer = Buffer.from(data, 'utf8');

			verified = crypto.verify(null, dataBuffer, key, sigBuffer);
		} else if (algorithm === 'sha256' || algorithm === 'sha512') {
			// HMAC verification
			const expectedSig = algorithm === 'sha256' 
				? sha256(data, publicKey) 
				: sha512(data, publicKey);
			
			// Timing-safe comparison
			verified = crypto.timingSafeEqual(
				Buffer.from(signature),
				Buffer.from(expectedSig)
			);
		} else {
			throw new Error(`Unsupported algorithm: ${algorithm}`);
		}

		return [{
			json: {
				verified,
				data,
				signature,
				algorithm,
				verifiedAt: new Date().toISOString(),
			},
		}];
	} catch (error) {
		return [{
			json: {
				verified: false,
				error: error instanceof Error ? error.message : 'Verification failed',
				data,
				signature,
				algorithm,
			},
		}];
	}
}

/**
 * Get protocol version information
 */
export async function getProtocolVersionOp(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const protocol = this.getNodeParameter('protocol', index, 'all') as string;

	const versions: Record<string, unknown> = {
		ilp: {
			version: ILP_VERSION,
			name: 'Interledger Protocol',
			description: 'Core protocol for routing value across ledgers',
			spec: 'https://interledger.org/rfcs/0027-interledger-protocol-4/',
		},
		stream: {
			version: STREAM_VERSION,
			name: 'STREAM Protocol',
			description: 'Streaming payments over ILP',
			spec: 'https://interledger.org/rfcs/0029-stream/',
		},
		openPayments: {
			version: OPEN_PAYMENTS_VERSION,
			name: 'Open Payments',
			description: 'REST API for interoperable payments',
			spec: 'https://openpayments.guide/',
		},
		spsp: {
			version: SPSP_VERSION,
			name: 'Simple Payment Setup Protocol',
			description: 'Simple setup for STREAM payments',
			spec: 'https://interledger.org/rfcs/0009-simple-payment-setup-protocol/',
		},
	};

	let result: Record<string, unknown>;

	if (protocol === 'all') {
		result = {
			protocols: versions,
			nodeVersion: '1.0.0',
			n8nApiVersion: 1,
		};
	} else if (versions[protocol]) {
		result = versions[protocol] as Record<string, unknown>;
	} else {
		throw new NodeOperationError(
			this.getNode(),
			`Unknown protocol: ${protocol}. Available: ${Object.keys(versions).join(', ')}`,
		);
	}

	return [{ json: result }];
}

/**
 * Execute utility operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'validatePaymentPointer':
			return validatePaymentPointerOp.call(this, index);
		case 'parsePaymentPointer':
			return parsePaymentPointerOp.call(this, index);
		case 'formatIlpAddress':
			return formatIlpAddressOp.call(this, index);
		case 'validateIlpAddress':
			return validateIlpAddressOp.call(this, index);
		case 'convertAmount':
			return convertAmountOp.call(this, index);
		case 'generateKeyPair':
			return generateKeyPairOp.call(this, index);
		case 'signData':
			return signDataOp.call(this, index);
		case 'verifySignature':
			return verifySignatureOp.call(this, index);
		case 'getProtocolVersion':
			return getProtocolVersionOp.call(this, index);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
