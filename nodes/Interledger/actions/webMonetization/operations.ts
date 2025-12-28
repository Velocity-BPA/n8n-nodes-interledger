/**
 * Web Monetization Operations
 * Implements Web Monetization API for browser-based streaming payments
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';
import { parsePaymentPointer, paymentPointerToUrl } from '../../utils/paymentPointerUtils';

/**
 * Web Monetization resource operations
 */
export const webMonetizationOperations = {
	resource: 'webMonetization',
	operations: [
		{ name: 'Create Monetization Link', value: 'createLink', description: 'Create a web monetization link tag' },
		{ name: 'Verify Monetization', value: 'verify', description: 'Verify web monetization status' },
		{ name: 'Get Monetization Status', value: 'getStatus', description: 'Get current monetization status' },
		{ name: 'Get Payment Stream', value: 'getPaymentStream', description: 'Get active payment stream details' },
		{ name: 'Get Receipt', value: 'getReceipt', description: 'Get a web monetization receipt' },
		{ name: 'Verify Receipt', value: 'verifyReceipt', description: 'Verify a web monetization receipt' },
		{ name: 'Get WMRI', value: 'getWmri', description: 'Get Web Monetization Receipt Issuer info' },
	],
};

/**
 * Create a web monetization link tag
 */
export async function createLink(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
	const includeReceipt = this.getNodeParameter('includeReceipt', index, false) as boolean;
	const receiptService = this.getNodeParameter('receiptService', index, '') as string;

	// Parse and validate payment pointer
	const parsed = parsePaymentPointer(paymentPointer);
	if (!parsed) {
		throw new NodeOperationError(this.getNode(), 'Invalid payment pointer format');
	}

	// Generate link tag HTML
	let linkTag = `<link rel="monetization" href="${paymentPointer}">`;

	// If receipt verification is requested, include receipt service
	const monetizationMeta: Record<string, unknown> = {
		paymentPointer,
		walletUrl: paymentPointerToUrl(paymentPointer),
		linkTag,
		includeReceipt,
	};

	if (includeReceipt && receiptService) {
		monetizationMeta.receiptService = receiptService;
		monetizationMeta.metaTag = `<meta name="monetization-receipt-service" content="${receiptService}">`;
	}

	// Generate JavaScript snippet for client-side integration
	monetizationMeta.javascriptSnippet = `
// Web Monetization detection and event handling
if (document.monetization) {
	document.monetization.addEventListener('monetizationstart', (event) => {
		console.log('Monetization started:', event.detail);
	});
	document.monetization.addEventListener('monetizationprogress', (event) => {
		console.log('Payment received:', event.detail.amount, event.detail.assetCode);
	});
	document.monetization.addEventListener('monetizationstop', (event) => {
		console.log('Monetization stopped');
	});
} else {
	console.log('Web Monetization not supported');
}`;

	return [{ json: monetizationMeta }];
}

/**
 * Verify web monetization status
 */
export async function verify(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	// Resolve payment pointer to verify it's valid and accessible
	const parsed = parsePaymentPointer(paymentPointer);
	if (!parsed) {
		return [{
			json: {
				verified: false,
				error: 'Invalid payment pointer format',
				paymentPointer,
			},
		}];
	}

	try {
		const walletUrl = paymentPointerToUrl(paymentPointer);
		const walletAddress = await client.getWalletAddress(walletUrl);

		return [{
			json: {
				verified: true,
				paymentPointer,
				walletAddress,
				supportsWebMonetization: true,
				assetCode: walletAddress.assetCode,
				assetScale: walletAddress.assetScale,
			},
		}];
	} catch (error) {
		return [{
			json: {
				verified: false,
				error: error instanceof Error ? error.message : 'Verification failed',
				paymentPointer,
			},
		}];
	}
}

/**
 * Get monetization status
 */
export async function getStatus(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = this.getNodeParameter('sessionId', index, '') as string;

	// Status object representing monetization state
	const status = {
		sessionId: sessionId || `wm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		state: 'pending', // pending, started, stopped
		totalAmount: '0',
		assetCode: 'USD',
		assetScale: 9,
		paymentCount: 0,
		startTime: null as string | null,
		lastPaymentTime: null as string | null,
		requestId: null as string | null,
	};

	return [{ json: status }];
}

/**
 * Get payment stream details
 */
export async function getPaymentStream(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const walletUrl = paymentPointerToUrl(paymentPointer);
		const walletAddress = await client.getWalletAddress(walletUrl);

		// Get incoming payments to track stream
		const incomingPayments = await client.listIncomingPayments(walletUrl);

		// Calculate stream statistics
		const activeStreams = incomingPayments.result?.filter(
			(p: { completedAt?: string }) => !p.completedAt
		) || [];

		const streamInfo = {
			paymentPointer,
			walletAddress: walletUrl,
			assetCode: walletAddress.assetCode,
			assetScale: walletAddress.assetScale,
			activeStreams: activeStreams.length,
			streams: activeStreams.map((stream: Record<string, unknown>) => ({
				id: stream.id,
				incomingAmount: stream.incomingAmount,
				receivedAmount: stream.receivedAmount,
				createdAt: stream.createdAt,
				expiresAt: stream.expiresAt,
			})),
		};

		return [{ json: streamInfo }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get payment stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get a web monetization receipt
 */
export async function getReceipt(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const incomingPaymentId = this.getNodeParameter('incomingPaymentId', index) as string;
	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		// Get the incoming payment to generate receipt data
		const payment = await client.getIncomingPayment(incomingPaymentId);

		// Generate WMRI-compatible receipt
		const receipt = {
			paymentId: payment.id,
			receivedAmount: payment.receivedAmount,
			assetCode: payment.receivedAmount?.assetCode,
			assetScale: payment.receivedAmount?.assetScale,
			createdAt: payment.createdAt,
			completedAt: payment.completedAt,
			walletAddress: payment.walletAddress,
			// Receipt verification data
			receipt: {
				version: 1,
				paymentId: payment.id,
				amount: payment.receivedAmount?.value || '0',
				assetCode: payment.receivedAmount?.assetCode || 'USD',
				assetScale: payment.receivedAmount?.assetScale || 9,
				timestamp: new Date().toISOString(),
			},
		};

		return [{ json: receipt }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Verify a web monetization receipt
 */
export async function verifyReceipt(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const receiptData = this.getNodeParameter('receiptData', index) as string;

	try {
		// Parse receipt data
		const receipt = typeof receiptData === 'string' ? JSON.parse(receiptData) : receiptData;

		// Validate receipt structure
		const requiredFields = ['paymentId', 'amount', 'assetCode', 'assetScale', 'timestamp'];
		const missingFields = requiredFields.filter(field => !(field in receipt));

		if (missingFields.length > 0) {
			return [{
				json: {
					valid: false,
					error: `Missing required fields: ${missingFields.join(', ')}`,
					receipt,
				},
			}];
		}

		// Validate timestamp is not too old (24 hour window)
		const receiptTime = new Date(receipt.timestamp).getTime();
		const now = Date.now();
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours

		if (now - receiptTime > maxAge) {
			return [{
				json: {
					valid: false,
					error: 'Receipt has expired (older than 24 hours)',
					receipt,
					age: Math.floor((now - receiptTime) / 1000 / 60 / 60) + ' hours',
				},
			}];
		}

		// Validate amount is positive
		if (BigInt(receipt.amount) <= BigInt(0)) {
			return [{
				json: {
					valid: false,
					error: 'Receipt amount must be positive',
					receipt,
				},
			}];
		}

		return [{
			json: {
				valid: true,
				receipt,
				verifiedAt: new Date().toISOString(),
			},
		}];
	} catch (error) {
		return [{
			json: {
				valid: false,
				error: `Failed to parse receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
		}];
	}
}

/**
 * Get Web Monetization Receipt Issuer info
 */
export async function getWmri(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const walletUrl = paymentPointerToUrl(paymentPointer);
		const walletAddress = await client.getWalletAddress(walletUrl);

		// WMRI (Web Monetization Receipt Issuer) info
		const wmri = {
			paymentPointer,
			walletAddress: walletUrl,
			issuer: {
				name: 'Open Payments Wallet',
				url: walletUrl,
				assetCode: walletAddress.assetCode,
				assetScale: walletAddress.assetScale,
			},
			capabilities: {
				receipts: true,
				streaming: true,
				verification: true,
			},
			authServer: walletAddress.authServer,
			resourceServer: walletAddress.resourceServer,
		};

		return [{ json: wmri }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get WMRI info: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Execute web monetization operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'createLink':
			return createLink.call(this, index);
		case 'verify':
			return verify.call(this, index);
		case 'getStatus':
			return getStatus.call(this, index);
		case 'getPaymentStream':
			return getPaymentStream.call(this, index);
		case 'getReceipt':
			return getReceipt.call(this, index);
		case 'verifyReceipt':
			return verifyReceipt.call(this, index);
		case 'getWmri':
			return getWmri.call(this, index);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
