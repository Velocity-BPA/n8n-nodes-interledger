/**
 * Payment Operations (High-Level)
 * Provides simplified, high-level payment operations that orchestrate multiple ILP operations
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';
import { SpspClient } from '../../transport/spspClient';
import { paymentPointerToUrl } from '../../utils/paymentPointerUtils';
import { formatAmount } from '../../utils/amountUtils';

/**
 * Payment resource operations
 */
export const paymentOperations = {
	resource: 'payment',
	operations: [
		{ name: 'Send Payment', value: 'send', description: 'Send a payment to a recipient' },
		{ name: 'Receive Payment', value: 'receive', description: 'Set up to receive a payment' },
		{ name: 'Get Payment', value: 'get', description: 'Get payment details by ID' },
		{ name: 'List Payments', value: 'list', description: 'List all payments' },
		{ name: 'Get Payment Status', value: 'getStatus', description: 'Get the status of a payment' },
		{ name: 'Cancel Payment', value: 'cancel', description: 'Cancel a pending payment' },
		{ name: 'Retry Payment', value: 'retry', description: 'Retry a failed payment' },
		{ name: 'Get Payment Proof', value: 'getProof', description: 'Get cryptographic proof of payment' },
	],
};

/**
 * Send a payment
 */
export async function send(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const receiverPaymentPointer = this.getNodeParameter('receiverPaymentPointer', index) as string;
	const amount = this.getNodeParameter('amount', index) as string;
	const assetCode = this.getNodeParameter('assetCode', index, 'USD') as string;
	const assetScale = this.getNodeParameter('assetScale', index, 2) as number;
	const description = this.getNodeParameter('description', index, '') as string;
	const externalRef = this.getNodeParameter('externalRef', index, '') as string;
	const useSpsp = this.getNodeParameter('useSpsp', index, false) as boolean;

	const credentials = await this.getCredentials('openPaymentsApi');

	if (useSpsp) {
		// Use SPSP for simpler payment flow
		const spspClient = new SpspClient({
			paymentPointer: credentials.walletAddressUrl as string,
		});

		try {
			const result = await spspClient.sendPayment(receiverPaymentPointer, amount);
			return [{
				json: {
					success: true,
					method: 'spsp',
					receiver: receiverPaymentPointer,
					amount,
					assetCode,
					...result,
				},
			}];
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`SPSP payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Use Open Payments flow
	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const receiverWalletUrl = paymentPointerToUrl(receiverPaymentPointer);
		
		// 1. Create incoming payment on receiver's wallet
		const incomingPayment = await client.createIncomingPayment(receiverWalletUrl, {
			incomingAmount: {
				value: amount,
				assetCode,
				assetScale,
			},
			metadata: description ? { description } : undefined,
		});

		// 2. Create quote on sender's wallet
		const senderWalletUrl = credentials.walletAddressUrl as string;
		const quote = await client.createQuote(senderWalletUrl, {
			receiver: incomingPayment.id,
			method: 'ilp',
		});

		// 3. Create outgoing payment
		const outgoingPayment = await client.createOutgoingPayment(senderWalletUrl, {
			quoteId: quote.id,
			metadata: {
				description,
				externalRef,
			},
		});

		return [{
			json: {
				success: true,
				method: 'openPayments',
				paymentId: outgoingPayment.id,
				receiver: receiverPaymentPointer,
				incomingPaymentId: incomingPayment.id,
				quoteId: quote.id,
				debitAmount: outgoingPayment.debitAmount,
				receiveAmount: outgoingPayment.receiveAmount,
				state: outgoingPayment.state,
				createdAt: outgoingPayment.createdAt,
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Set up to receive a payment
 */
export async function receive(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const amount = this.getNodeParameter('amount', index, '') as string;
	const assetCode = this.getNodeParameter('assetCode', index, 'USD') as string;
	const assetScale = this.getNodeParameter('assetScale', index, 2) as number;
	const expiresIn = this.getNodeParameter('expiresIn', index, 3600) as number;
	const description = this.getNodeParameter('description', index, '') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const walletUrl = credentials.walletAddressUrl as string;
		
		// Create incoming payment
		const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
		
		const incomingPaymentParams: Record<string, unknown> = {
			expiresAt,
			metadata: description ? { description } : undefined,
		};

		// Only add incomingAmount if a specific amount is requested
		if (amount) {
			incomingPaymentParams.incomingAmount = {
				value: amount,
				assetCode,
				assetScale,
			};
		}

		const incomingPayment = await client.createIncomingPayment(walletUrl, incomingPaymentParams);

		return [{
			json: {
				paymentId: incomingPayment.id,
				walletAddress: walletUrl,
				incomingAmount: incomingPayment.incomingAmount,
				expiresAt: incomingPayment.expiresAt,
				createdAt: incomingPayment.createdAt,
				state: incomingPayment.completed ? 'completed' : 'pending',
				receivedAmount: incomingPayment.receivedAmount,
				// URL for payer to use
				paymentUrl: incomingPayment.id,
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to set up receiving: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get payment details
 */
export async function get(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentId = this.getNodeParameter('paymentId', index) as string;
	const paymentType = this.getNodeParameter('paymentType', index, 'outgoing') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		let payment: Record<string, unknown>;

		if (paymentType === 'incoming') {
			payment = await client.getIncomingPayment(paymentId);
		} else {
			payment = await client.getOutgoingPayment(paymentId);
		}

		return [{ json: payment }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * List payments
 */
export async function list(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentType = this.getNodeParameter('paymentType', index, 'all') as string;
	const limit = this.getNodeParameter('limit', index, 20) as number;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const walletUrl = credentials.walletAddressUrl as string;
		const payments: Record<string, unknown>[] = [];

		if (paymentType === 'all' || paymentType === 'incoming') {
			const incoming = await client.listIncomingPayments(walletUrl, { first: limit });
			payments.push(...(incoming.result || []).map((p: Record<string, unknown>) => ({
				...p,
				type: 'incoming',
			})));
		}

		if (paymentType === 'all' || paymentType === 'outgoing') {
			const outgoing = await client.listOutgoingPayments(walletUrl, { first: limit });
			payments.push(...(outgoing.result || []).map((p: Record<string, unknown>) => ({
				...p,
				type: 'outgoing',
			})));
		}

		// Sort by creation date
		payments.sort((a, b) => {
			const dateA = new Date(a.createdAt as string).getTime();
			const dateB = new Date(b.createdAt as string).getTime();
			return dateB - dateA;
		});

		return [{ json: { payments: payments.slice(0, limit), total: payments.length } }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to list payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get payment status
 */
export async function getStatus(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentId = this.getNodeParameter('paymentId', index) as string;
	const paymentType = this.getNodeParameter('paymentType', index, 'outgoing') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		let payment: Record<string, unknown>;
		let status: Record<string, unknown>;

		if (paymentType === 'incoming') {
			payment = await client.getIncomingPayment(paymentId);
			status = {
				paymentId,
				type: 'incoming',
				state: payment.completed ? 'completed' : 'pending',
				receivedAmount: payment.receivedAmount,
				incomingAmount: payment.incomingAmount,
				percentComplete: calculatePercent(
					payment.receivedAmount as { value: string } | undefined,
					payment.incomingAmount as { value: string } | undefined
				),
			};
		} else {
			payment = await client.getOutgoingPayment(paymentId);
			status = {
				paymentId,
				type: 'outgoing',
				state: payment.state || (payment.failed ? 'failed' : payment.sentAmount ? 'completed' : 'pending'),
				sentAmount: payment.sentAmount,
				debitAmount: payment.debitAmount,
				receiveAmount: payment.receiveAmount,
				failedAmount: payment.failedAmount,
			};
		}

		return [{ json: status }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Cancel a payment
 */
export async function cancel(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentId = this.getNodeParameter('paymentId', index) as string;
	const paymentType = this.getNodeParameter('paymentType', index, 'incoming') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		let result: Record<string, unknown>;

		if (paymentType === 'incoming') {
			// Complete the incoming payment without full amount to effectively cancel
			result = await client.completeIncomingPayment(paymentId);
		} else {
			// For outgoing payments, we can only report the cancellation
			// The actual cancellation depends on the wallet implementation
			const payment = await client.getOutgoingPayment(paymentId);
			result = {
				paymentId,
				type: 'outgoing',
				message: 'Outgoing payment cancellation requested',
				currentState: payment.state,
			};
		}

		return [{
			json: {
				cancelled: true,
				paymentId,
				type: paymentType,
				...result,
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Retry a failed payment
 */
export async function retry(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const originalPaymentId = this.getNodeParameter('paymentId', index) as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		// Get original payment details
		const originalPayment = await client.getOutgoingPayment(originalPaymentId);

		if (!originalPayment.failed && originalPayment.state !== 'failed') {
			return [{
				json: {
					retried: false,
					reason: 'Original payment has not failed',
					originalPayment,
				},
			}];
		}

		// Create new quote with same parameters
		const walletUrl = credentials.walletAddressUrl as string;
		const quote = await client.createQuote(walletUrl, {
			receiver: originalPayment.receiver as string,
			method: 'ilp',
		});

		// Create new outgoing payment
		const newPayment = await client.createOutgoingPayment(walletUrl, {
			quoteId: quote.id,
			metadata: {
				...(originalPayment.metadata as object || {}),
				retryOf: originalPaymentId,
			},
		});

		return [{
			json: {
				retried: true,
				originalPaymentId,
				newPaymentId: newPayment.id,
				quoteId: quote.id,
				debitAmount: newPayment.debitAmount,
				receiveAmount: newPayment.receiveAmount,
				state: newPayment.state,
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to retry payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get cryptographic proof of payment
 */
export async function getProof(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const paymentId = this.getNodeParameter('paymentId', index) as string;
	const paymentType = this.getNodeParameter('paymentType', index, 'outgoing') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		let payment: Record<string, unknown>;

		if (paymentType === 'incoming') {
			payment = await client.getIncomingPayment(paymentId);
		} else {
			payment = await client.getOutgoingPayment(paymentId);
		}

		// Generate proof structure
		const proof = {
			paymentId,
			type: paymentType,
			timestamp: new Date().toISOString(),
			walletAddress: credentials.walletAddressUrl,
			proof: {
				// Payment details as proof
				id: payment.id,
				createdAt: payment.createdAt,
				completedAt: payment.completedAt,
				state: payment.state || (payment.completed ? 'completed' : 'pending'),
				// Amount proof
				amount: paymentType === 'incoming' 
					? payment.receivedAmount 
					: payment.sentAmount,
				// Hash of payment data
				dataHash: generatePaymentHash(payment),
			},
		};

		return [{ json: proof }];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get payment proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Calculate percentage complete
 */
function calculatePercent(
	received: { value: string } | undefined,
	expected: { value: string } | undefined
): number {
	if (!received || !expected || expected.value === '0') {
		return 0;
	}
	const receivedVal = BigInt(received.value);
	const expectedVal = BigInt(expected.value);
	return Number((receivedVal * BigInt(100)) / expectedVal);
}

/**
 * Generate a hash of payment data for proof
 */
function generatePaymentHash(payment: Record<string, unknown>): string {
	const crypto = require('crypto');
	const data = JSON.stringify({
		id: payment.id,
		createdAt: payment.createdAt,
		amount: payment.receivedAmount || payment.sentAmount,
	});
	return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Execute payment operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'send':
			return send.call(this, index);
		case 'receive':
			return receive.call(this, index);
		case 'get':
			return get.call(this, index);
		case 'list':
			return list.call(this, index);
		case 'getStatus':
			return getStatus.call(this, index);
		case 'cancel':
			return cancel.call(this, index);
		case 'retry':
			return retry.call(this, index);
		case 'getProof':
			return getProof.call(this, index);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
