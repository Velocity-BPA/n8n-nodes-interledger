/**
 * Interledger Trigger Node
 * Webhook and polling triggers for Interledger Protocol events
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';
import { showLicensingNotice } from './utils';
import { hmacSha256 } from './utils/signatureUtils';
import { WEBHOOK_EVENTS } from './constants';

// Show licensing notice once per load
showLicensingNotice();

export class InterledgerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Interledger Trigger',
		name: 'interledgerTrigger',
		icon: 'file:interledger.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Trigger workflows on Interledger Protocol events',
		defaults: {
			name: 'Interledger Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'openPaymentsApi',
				required: false,
			},
			{
				name: 'rafikiAdminApi',
				required: false,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event Category',
				name: 'eventCategory',
				type: 'options',
				options: [
					{ name: 'Incoming Payments', value: 'incomingPayment', description: 'Incoming payment events' },
					{ name: 'Outgoing Payments', value: 'outgoingPayment', description: 'Outgoing payment events' },
					{ name: 'Quotes', value: 'quote', description: 'Quote events' },
					{ name: 'Grants', value: 'grant', description: 'Grant/authorization events' },
					{ name: 'STREAM', value: 'stream', description: 'STREAM protocol events' },
					{ name: 'Connector', value: 'connector', description: 'Connector events' },
					{ name: 'Wallet', value: 'wallet', description: 'Wallet address events' },
					{ name: 'Web Monetization', value: 'webMonetization', description: 'Web monetization events' },
					{ name: 'All Events', value: 'all', description: 'Receive all events' },
				],
				default: 'incomingPayment',
				description: 'Category of events to listen for',
			},

			// Incoming Payment Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['incomingPayment'] } },
				options: [
					{ name: 'Payment Created', value: 'incoming_payment.created', description: 'An incoming payment was created' },
					{ name: 'Payment Completed', value: 'incoming_payment.completed', description: 'An incoming payment was completed' },
					{ name: 'Payment Expired', value: 'incoming_payment.expired', description: 'An incoming payment expired' },
					{ name: 'Payment Received', value: 'incoming_payment.received', description: 'Money was received' },
					{ name: 'Partial Payment', value: 'incoming_payment.partial', description: 'Partial payment received' },
				],
				default: 'incoming_payment.created',
			},

			// Outgoing Payment Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['outgoingPayment'] } },
				options: [
					{ name: 'Payment Created', value: 'outgoing_payment.created', description: 'An outgoing payment was created' },
					{ name: 'Payment Completed', value: 'outgoing_payment.completed', description: 'An outgoing payment completed' },
					{ name: 'Payment Failed', value: 'outgoing_payment.failed', description: 'An outgoing payment failed' },
					{ name: 'Payment Sent', value: 'outgoing_payment.sent', description: 'Money was sent' },
					{ name: 'Payment Cancelled', value: 'outgoing_payment.cancelled', description: 'Payment was cancelled' },
				],
				default: 'outgoing_payment.created',
			},

			// Quote Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['quote'] } },
				options: [
					{ name: 'Quote Created', value: 'quote.created', description: 'A quote was created' },
					{ name: 'Quote Expired', value: 'quote.expired', description: 'A quote expired' },
					{ name: 'Quote Accepted', value: 'quote.accepted', description: 'A quote was accepted' },
				],
				default: 'quote.created',
			},

			// Grant Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['grant'] } },
				options: [
					{ name: 'Grant Requested', value: 'grant.requested', description: 'A grant was requested' },
					{ name: 'Grant Approved', value: 'grant.approved', description: 'A grant was approved' },
					{ name: 'Grant Denied', value: 'grant.denied', description: 'A grant was denied' },
					{ name: 'Grant Revoked', value: 'grant.revoked', description: 'A grant was revoked' },
				],
				default: 'grant.requested',
			},

			// STREAM Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['stream'] } },
				options: [
					{ name: 'Connection Opened', value: 'stream.connection_opened', description: 'STREAM connection opened' },
					{ name: 'Connection Closed', value: 'stream.connection_closed', description: 'STREAM connection closed' },
					{ name: 'Money Received', value: 'stream.money_received', description: 'Money received via STREAM' },
					{ name: 'Money Sent', value: 'stream.money_sent', description: 'Money sent via STREAM' },
					{ name: 'Stream Error', value: 'stream.error', description: 'STREAM error occurred' },
				],
				default: 'stream.money_received',
			},

			// Connector Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['connector'] } },
				options: [
					{ name: 'Peer Connected', value: 'connector.peer_connected', description: 'A peer connected' },
					{ name: 'Peer Disconnected', value: 'connector.peer_disconnected', description: 'A peer disconnected' },
					{ name: 'Route Added', value: 'connector.route_added', description: 'A route was added' },
					{ name: 'Route Removed', value: 'connector.route_removed', description: 'A route was removed' },
					{ name: 'Liquidity Changed', value: 'connector.liquidity_changed', description: 'Liquidity changed' },
					{ name: 'Balance Changed', value: 'connector.balance_changed', description: 'Balance changed' },
				],
				default: 'connector.peer_connected',
			},

			// Wallet Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['wallet'] } },
				options: [
					{ name: 'Wallet Created', value: 'wallet.created', description: 'A wallet address was created' },
					{ name: 'Wallet Updated', value: 'wallet.updated', description: 'A wallet address was updated' },
					{ name: 'Balance Changed', value: 'wallet.balance_changed', description: 'Wallet balance changed' },
				],
				default: 'wallet.created',
			},

			// Web Monetization Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['webMonetization'] } },
				options: [
					{ name: 'Monetization Started', value: 'webmonetization.started', description: 'Monetization started' },
					{ name: 'Monetization Stopped', value: 'webmonetization.stopped', description: 'Monetization stopped' },
					{ name: 'Payment Stream', value: 'webmonetization.payment', description: 'Payment stream event' },
					{ name: 'Receipt Verified', value: 'webmonetization.receipt_verified', description: 'Receipt was verified' },
				],
				default: 'webmonetization.payment',
			},

			// All Events
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: { show: { eventCategory: ['all'] } },
				options: [
					{ name: 'All Events', value: '*', description: 'Receive all events' },
				],
				default: '*',
			},

			// Webhook Secret
			{
				displayName: 'Webhook Secret',
				name: 'webhookSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Secret for verifying webhook signatures',
			},

			// Filter Options
			{
				displayName: 'Filter Options',
				name: 'filterOptions',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Wallet Address',
						name: 'walletAddress',
						type: 'string',
						default: '',
						description: 'Filter by wallet address',
					},
					{
						displayName: 'Asset Code',
						name: 'assetCode',
						type: 'string',
						default: '',
						description: 'Filter by asset code (e.g., USD, EUR)',
					},
					{
						displayName: 'Minimum Amount',
						name: 'minAmount',
						type: 'string',
						default: '',
						description: 'Minimum amount to trigger',
					},
					{
						displayName: 'Payment Pointer',
						name: 'paymentPointer',
						type: 'string',
						default: '',
						description: 'Filter by payment pointer',
					},
				],
			},

			// Signature Verification
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description: 'Whether to verify the webhook signature',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				// Check if webhook was already registered
				if (webhookData.webhookId) {
					return true;
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const eventCategory = this.getNodeParameter('eventCategory') as string;
				const webhookSecret = this.getNodeParameter('webhookSecret') as string;

				const webhookData = this.getWorkflowStaticData('node');

				try {
					// Try to register webhook with Rafiki if credentials available
					const credentials = await this.getCredentials('rafikiAdminApi').catch(() => null);

					if (credentials) {
						// Would register webhook with Rafiki here
						// const client = new RafikiClient({...});
						// const webhook = await client.registerWebhook({...});
					}

					// Store webhook info
					webhookData.webhookId = `wh_${Date.now()}`;
					webhookData.webhookUrl = webhookUrl;
					webhookData.event = event;
					webhookData.eventCategory = eventCategory;
					webhookData.secret = webhookSecret || generateSecret();
					webhookData.createdAt = new Date().toISOString();

					return true;
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to create webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				try {
					// Would unregister webhook with Rafiki here if needed

					// Clear stored data
					delete webhookData.webhookId;
					delete webhookData.webhookUrl;
					delete webhookData.event;
					delete webhookData.secret;

					return true;
				} catch (error) {
					return false;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData() as Record<string, unknown>;
		const headers = this.getHeaderData() as Record<string, string>;

		const event = this.getNodeParameter('event') as string;
		const eventCategory = this.getNodeParameter('eventCategory') as string;
		const verifySignature = this.getNodeParameter('verifySignature') as boolean;
		const webhookSecret = this.getNodeParameter('webhookSecret') as string;
		const filterOptions = this.getNodeParameter('filterOptions', {}) as {
			walletAddress?: string;
			assetCode?: string;
			minAmount?: string;
			paymentPointer?: string;
		};

		// Verify signature if enabled
		if (verifySignature && webhookSecret) {
			const signature = headers['x-signature'] || headers['signature'];
			const timestamp = headers['x-timestamp'] || headers['timestamp'];

			if (!signature) {
				return {
					webhookResponse: { status: 'error', message: 'Missing signature' },
				};
			}

			const payload = JSON.stringify(body);
			const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
			const expectedSignature = hmacSha256(signedPayload, webhookSecret);

			if (signature !== expectedSignature) {
				return {
					webhookResponse: { status: 'error', message: 'Invalid signature' },
				};
			}

			// Check timestamp freshness (5 minute tolerance)
			if (timestamp) {
				const eventTime = parseInt(timestamp, 10);
				const now = Math.floor(Date.now() / 1000);
				if (Math.abs(now - eventTime) > 300) {
					return {
						webhookResponse: { status: 'error', message: 'Timestamp too old' },
					};
				}
			}
		}

		// Get event type from payload
		const eventType = body.type as string || body.event as string || '';

		// Filter by event type
		if (event !== '*' && eventType !== event) {
			// Event doesn't match filter
			return {
				webhookResponse: { status: 'ignored', message: 'Event filtered' },
			};
		}

		// Filter by event category
		if (eventCategory !== 'all') {
			const eventPrefix = eventType.split('.')[0];
			const categoryMap: Record<string, string[]> = {
				incomingPayment: ['incoming_payment'],
				outgoingPayment: ['outgoing_payment'],
				quote: ['quote'],
				grant: ['grant'],
				stream: ['stream'],
				connector: ['connector'],
				wallet: ['wallet', 'wallet_address'],
				webMonetization: ['webmonetization', 'web_monetization'],
			};

			const validPrefixes = categoryMap[eventCategory] || [];
			if (!validPrefixes.some(p => eventPrefix.includes(p))) {
				return {
					webhookResponse: { status: 'ignored', message: 'Category filtered' },
				};
			}
		}

		// Apply additional filters
		if (filterOptions.walletAddress) {
			const walletAddress = body.walletAddress as string || body.wallet_address as string;
			if (walletAddress && !walletAddress.includes(filterOptions.walletAddress)) {
				return {
					webhookResponse: { status: 'ignored', message: 'Wallet address filtered' },
				};
			}
		}

		if (filterOptions.assetCode) {
			const assetCode = body.assetCode as string || 
				(body.amount as { assetCode?: string })?.assetCode ||
				(body.receivedAmount as { assetCode?: string })?.assetCode;
			if (assetCode && assetCode !== filterOptions.assetCode) {
				return {
					webhookResponse: { status: 'ignored', message: 'Asset code filtered' },
				};
			}
		}

		if (filterOptions.minAmount) {
			const amount = body.amount as { value?: string } || 
				body.receivedAmount as { value?: string } ||
				body.sentAmount as { value?: string };
			if (amount?.value) {
				const value = BigInt(amount.value);
				const minValue = BigInt(filterOptions.minAmount);
				if (value < minValue) {
					return {
						webhookResponse: { status: 'ignored', message: 'Amount below minimum' },
					};
				}
			}
		}

		if (filterOptions.paymentPointer) {
			const paymentPointer = body.paymentPointer as string || body.payment_pointer as string;
			if (paymentPointer && !paymentPointer.includes(filterOptions.paymentPointer)) {
				return {
					webhookResponse: { status: 'ignored', message: 'Payment pointer filtered' },
				};
			}
		}

		// Return the webhook data
		return {
			workflowData: [
				[
					{
						json: {
							event: eventType,
							timestamp: new Date().toISOString(),
							data: body,
							headers: {
								contentType: headers['content-type'],
								userAgent: headers['user-agent'],
							},
						},
					},
				],
			],
		};
	}
}

/**
 * Generate a random webhook secret
 */
function generateSecret(): string {
	const crypto = require('crypto');
	return crypto.randomBytes(32).toString('hex');
}
