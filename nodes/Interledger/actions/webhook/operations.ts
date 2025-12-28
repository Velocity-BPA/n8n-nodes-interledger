/**
 * Webhook Operations
 * Manages webhooks for real-time event notifications
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { RafikiClient } from '../../transport/rafikiClient';
import { sha256, verifySignature } from '../../utils/signatureUtils';
import { WEBHOOK_EVENTS } from '../../constants';

/**
 * Webhook resource operations
 */
export const webhookOperations = {
	resource: 'webhook',
	operations: [
		{ name: 'Create Webhook', value: 'create', description: 'Create a new webhook endpoint' },
		{ name: 'Get Webhook', value: 'get', description: 'Get webhook details' },
		{ name: 'Update Webhook', value: 'update', description: 'Update webhook configuration' },
		{ name: 'Delete Webhook', value: 'delete', description: 'Delete a webhook' },
		{ name: 'List Webhooks', value: 'list', description: 'List all webhooks' },
		{ name: 'Get Webhook Events', value: 'getEvents', description: 'Get events for a webhook' },
		{ name: 'Verify Webhook Signature', value: 'verifySignature', description: 'Verify a webhook signature' },
	],
};

interface WebhookConfig {
	id: string;
	url: string;
	events: string[];
	secret: string;
	active: boolean;
	createdAt: string;
	lastTriggeredAt?: string;
	failureCount: number;
}

// In-memory webhook storage (in production, would use database)
const webhooks: Map<string, WebhookConfig> = new Map();

/**
 * Create a new webhook
 */
export async function create(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const url = this.getNodeParameter('url', index) as string;
	const events = this.getNodeParameter('events', index) as string[];
	const secret = this.getNodeParameter('secret', index, '') as string;

	// Validate URL
	try {
		new URL(url);
	} catch {
		throw new NodeOperationError(this.getNode(), 'Invalid webhook URL');
	}

	// Validate events
	const validEvents = Object.values(WEBHOOK_EVENTS);
	const invalidEvents = events.filter(e => !validEvents.includes(e));
	if (invalidEvents.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid events: ${invalidEvents.join(', ')}`,
		);
	}

	// Generate webhook ID and secret
	const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	const webhookSecret = secret || generateSecret();

	const webhook: WebhookConfig = {
		id: webhookId,
		url,
		events,
		secret: webhookSecret,
		active: true,
		createdAt: new Date().toISOString(),
		failureCount: 0,
	};

	// Store webhook
	webhooks.set(webhookId, webhook);

	// Try to register with Rafiki if available
	try {
		const credentials = await this.getCredentials('rafikiAdminApi');
		const client = new RafikiClient({
			adminUrl: credentials.adminUrl as string,
			apiKey: credentials.apiKey as string,
		});

		// Rafiki webhook registration would go here
		// await client.registerWebhook(webhook);
	} catch {
		// Rafiki not configured, continue with local storage
	}

	return [{
		json: {
			id: webhook.id,
			url: webhook.url,
			events: webhook.events,
			secret: webhook.secret,
			active: webhook.active,
			createdAt: webhook.createdAt,
			message: 'Webhook created successfully. Store the secret securely.',
		},
	}];
}

/**
 * Get webhook details
 */
export async function get(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const webhookId = this.getNodeParameter('webhookId', index) as string;

	const webhook = webhooks.get(webhookId);
	if (!webhook) {
		throw new NodeOperationError(this.getNode(), `Webhook not found: ${webhookId}`);
	}

	// Don't expose secret in get response
	return [{
		json: {
			id: webhook.id,
			url: webhook.url,
			events: webhook.events,
			active: webhook.active,
			createdAt: webhook.createdAt,
			lastTriggeredAt: webhook.lastTriggeredAt,
			failureCount: webhook.failureCount,
		},
	}];
}

/**
 * Update webhook configuration
 */
export async function update(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const webhookId = this.getNodeParameter('webhookId', index) as string;
	const url = this.getNodeParameter('url', index, '') as string;
	const events = this.getNodeParameter('events', index, []) as string[];
	const active = this.getNodeParameter('active', index, undefined) as boolean | undefined;
	const resetSecret = this.getNodeParameter('resetSecret', index, false) as boolean;

	const webhook = webhooks.get(webhookId);
	if (!webhook) {
		throw new NodeOperationError(this.getNode(), `Webhook not found: ${webhookId}`);
	}

	// Update fields
	if (url) {
		try {
			new URL(url);
			webhook.url = url;
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid webhook URL');
		}
	}

	if (events.length > 0) {
		const validEvents = Object.values(WEBHOOK_EVENTS);
		const invalidEvents = events.filter(e => !validEvents.includes(e));
		if (invalidEvents.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid events: ${invalidEvents.join(', ')}`,
			);
		}
		webhook.events = events;
	}

	if (active !== undefined) {
		webhook.active = active;
	}

	let newSecret: string | undefined;
	if (resetSecret) {
		webhook.secret = generateSecret();
		newSecret = webhook.secret;
		webhook.failureCount = 0;
	}

	webhooks.set(webhookId, webhook);

	const response: Record<string, unknown> = {
		id: webhook.id,
		url: webhook.url,
		events: webhook.events,
		active: webhook.active,
		updatedAt: new Date().toISOString(),
	};

	if (newSecret) {
		response.secret = newSecret;
		response.message = 'Secret has been reset. Store it securely.';
	}

	return [{ json: response }];
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const webhookId = this.getNodeParameter('webhookId', index) as string;

	const webhook = webhooks.get(webhookId);
	if (!webhook) {
		throw new NodeOperationError(this.getNode(), `Webhook not found: ${webhookId}`);
	}

	webhooks.delete(webhookId);

	return [{
		json: {
			id: webhookId,
			deleted: true,
			deletedAt: new Date().toISOString(),
		},
	}];
}

/**
 * List all webhooks
 */
export async function list(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const activeOnly = this.getNodeParameter('activeOnly', index, false) as boolean;

	let webhookList = Array.from(webhooks.values());

	if (activeOnly) {
		webhookList = webhookList.filter(w => w.active);
	}

	// Don't expose secrets
	const sanitized = webhookList.map(w => ({
		id: w.id,
		url: w.url,
		events: w.events,
		active: w.active,
		createdAt: w.createdAt,
		lastTriggeredAt: w.lastTriggeredAt,
		failureCount: w.failureCount,
	}));

	return [{
		json: {
			webhooks: sanitized,
			total: sanitized.length,
		},
	}];
}

/**
 * Get events for a webhook
 */
export async function getEvents(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const webhookId = this.getNodeParameter('webhookId', index, '') as string;
	const eventType = this.getNodeParameter('eventType', index, '') as string;

	// Return available event types with descriptions
	const eventDescriptions: Record<string, string> = {
		// Incoming Payment events
		[WEBHOOK_EVENTS.INCOMING_PAYMENT_CREATED]: 'An incoming payment has been created',
		[WEBHOOK_EVENTS.INCOMING_PAYMENT_COMPLETED]: 'An incoming payment has been completed',
		[WEBHOOK_EVENTS.INCOMING_PAYMENT_EXPIRED]: 'An incoming payment has expired',
		
		// Outgoing Payment events
		[WEBHOOK_EVENTS.OUTGOING_PAYMENT_CREATED]: 'An outgoing payment has been created',
		[WEBHOOK_EVENTS.OUTGOING_PAYMENT_COMPLETED]: 'An outgoing payment has been completed',
		[WEBHOOK_EVENTS.OUTGOING_PAYMENT_FAILED]: 'An outgoing payment has failed',
		
		// Quote events
		[WEBHOOK_EVENTS.QUOTE_CREATED]: 'A quote has been created',
		[WEBHOOK_EVENTS.QUOTE_EXPIRED]: 'A quote has expired',
		
		// Grant events
		[WEBHOOK_EVENTS.GRANT_REQUESTED]: 'A grant has been requested',
		[WEBHOOK_EVENTS.GRANT_APPROVED]: 'A grant has been approved',
		[WEBHOOK_EVENTS.GRANT_DENIED]: 'A grant has been denied',
		[WEBHOOK_EVENTS.GRANT_REVOKED]: 'A grant has been revoked',
		
		// Wallet events
		[WEBHOOK_EVENTS.WALLET_ADDRESS_CREATED]: 'A wallet address has been created',
		[WEBHOOK_EVENTS.WALLET_ADDRESS_UPDATED]: 'A wallet address has been updated',
		
		// Peer events
		[WEBHOOK_EVENTS.PEER_CONNECTED]: 'A peer has connected',
		[WEBHOOK_EVENTS.PEER_DISCONNECTED]: 'A peer has disconnected',
		
		// Asset events
		[WEBHOOK_EVENTS.ASSET_CREATED]: 'An asset has been created',
		[WEBHOOK_EVENTS.ASSET_LIQUIDITY_ADDED]: 'Liquidity has been added to an asset',
		[WEBHOOK_EVENTS.ASSET_LIQUIDITY_REMOVED]: 'Liquidity has been removed from an asset',
	};

	let events: Array<{ event: string; description: string }>;

	if (eventType) {
		events = [{ event: eventType, description: eventDescriptions[eventType] || 'Unknown event' }];
	} else {
		events = Object.entries(eventDescriptions).map(([event, description]) => ({
			event,
			description,
		}));
	}

	// If webhookId provided, filter to subscribed events
	if (webhookId) {
		const webhook = webhooks.get(webhookId);
		if (webhook) {
			events = events.filter(e => webhook.events.includes(e.event));
		}
	}

	return [{
		json: {
			events,
			total: events.length,
		},
	}];
}

/**
 * Verify a webhook signature
 */
export async function verifyWebhookSignature(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const payload = this.getNodeParameter('payload', index) as string;
	const signature = this.getNodeParameter('signature', index) as string;
	const secret = this.getNodeParameter('secret', index) as string;
	const timestamp = this.getNodeParameter('timestamp', index, '') as string;

	try {
		// Verify timestamp if provided (prevent replay attacks)
		if (timestamp) {
			const eventTime = parseInt(timestamp, 10);
			const now = Math.floor(Date.now() / 1000);
			const tolerance = 300; // 5 minutes

			if (Math.abs(now - eventTime) > tolerance) {
				return [{
					json: {
						valid: false,
						error: 'Timestamp too old or in future',
						timestampDiff: Math.abs(now - eventTime),
					},
				}];
			}
		}

		// Calculate expected signature
		const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
		const expectedSignature = sha256(signedPayload, secret);

		// Compare signatures (constant-time comparison)
		const isValid = timingSafeEqual(signature, expectedSignature);

		return [{
			json: {
				valid: isValid,
				payload: isValid ? JSON.parse(payload) : null,
				verifiedAt: new Date().toISOString(),
			},
		}];
	} catch (error) {
		return [{
			json: {
				valid: false,
				error: error instanceof Error ? error.message : 'Verification failed',
			},
		}];
	}
}

/**
 * Generate a random secret
 */
function generateSecret(): string {
	const crypto = require('crypto');
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
	const crypto = require('crypto');
	if (a.length !== b.length) {
		return false;
	}
	try {
		return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
	} catch {
		return false;
	}
}

/**
 * Execute webhook operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'create':
			return create.call(this, index);
		case 'get':
			return get.call(this, index);
		case 'update':
			return update.call(this, index);
		case 'delete':
			return deleteWebhook.call(this, index);
		case 'list':
			return list.call(this, index);
		case 'getEvents':
			return getEvents.call(this, index);
		case 'verifySignature':
			return verifyWebhookSignature.call(this, index);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
