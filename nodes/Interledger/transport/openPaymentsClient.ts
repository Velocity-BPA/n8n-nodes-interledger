/**
 * Open Payments API Client
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 *
 * Open Payments is a protocol for initiating and receiving interledger payments.
 * This client handles wallet address operations, incoming/outgoing payments, quotes, and grants.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createSignedHeaders, createContentDigest } from '../utils/signatureUtils';
import { paymentPointerToUrl, validatePaymentPointer } from '../utils/paymentPointerUtils';
import { toIntegerAmount, toDisplayAmount, Amount } from '../utils/amountUtils';
import {
	GrantAccess,
	GrantRequest,
	GrantResponse,
	ACCESS_TYPES,
	ACCESS_ACTIONS,
} from '../constants/grantTypes';
import { OPEN_PAYMENTS_ERRORS } from '../constants/errorCodes';

// Open Payments API types
export interface WalletAddress {
	id: string;
	publicName?: string;
	assetCode: string;
	assetScale: number;
	authServer: string;
	resourceServer: string;
}

export interface IncomingPayment {
	id: string;
	walletAddress: string;
	incomingAmount?: Amount;
	receivedAmount: Amount;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
	expiresAt?: string;
	metadata?: Record<string, unknown>;
}

export interface OutgoingPayment {
	id: string;
	walletAddress: string;
	quoteId?: string;
	receiver: string;
	debitAmount: Amount;
	receiveAmount: Amount;
	sentAmount: Amount;
	failed: boolean;
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}

export interface Quote {
	id: string;
	walletAddress: string;
	receiver: string;
	debitAmount: Amount;
	receiveAmount: Amount;
	createdAt: string;
	expiresAt: string;
}

export interface Grant {
	access_token: {
		value: string;
		manage: string;
		expires_in?: number;
		access: GrantAccess[];
	};
	continue?: {
		access_token: {
			value: string;
		};
		uri: string;
		wait?: number;
	};
	interact?: {
		redirect: string;
		finish?: string;
	};
}

export interface OpenPaymentsClientConfig {
	walletAddressUrl: string;
	privateKey: string;
	publicKey: string;
	keyId: string;
	authServer?: string;
	accessTokens?: {
		incoming?: string;
		outgoing?: string;
		quote?: string;
	};
	timeout?: number;
}

export class OpenPaymentsClient {
	private config: OpenPaymentsClientConfig;
	private httpClient: AxiosInstance;
	private walletAddress?: WalletAddress;

	constructor(config: OpenPaymentsClientConfig) {
		this.config = config;
		this.httpClient = axios.create({
			timeout: config.timeout || 30000,
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
	}

	/**
	 * Apply HTTP signatures to request
	 */
	private async signRequest(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
		const method = (config.method || 'GET').toUpperCase();
		const url = config.url || '';

		const headers: Record<string, string> = {
			...(config.headers as Record<string, string>),
		};

		// Add content digest for requests with body
		if (config.data && ['POST', 'PUT', 'PATCH'].includes(method)) {
			const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
			headers['Content-Digest'] = createContentDigest(body);
		}

		// Apply signature headers
		const signedHeaders = createSignedHeaders(
			{
				method,
				url,
				headers,
			},
			{
				keyId: this.config.keyId,
				privateKey: this.config.privateKey,
			},
		);

		return {
			...config,
			headers: signedHeaders,
		};
	}

	/**
	 * Make authenticated request
	 */
	private async request<T>(config: AxiosRequestConfig, accessToken?: string): Promise<T> {
		const signedConfig = await this.signRequest(config);

		if (accessToken) {
			signedConfig.headers = {
				...signedConfig.headers,
				'Authorization': `GNAP ${accessToken}`,
			};
		}

		const response = await this.httpClient.request<T>(signedConfig);
		return response.data;
	}

	// ===================
	// Wallet Address Operations
	// ===================

	/**
	 * Get wallet address information by resolving payment pointer or URL
	 */
	async getWalletAddress(walletAddressOrPointer: string): Promise<WalletAddress> {
		let url = walletAddressOrPointer;

		// Convert payment pointer to URL if needed
		if (walletAddressOrPointer.startsWith('$')) {
			url = paymentPointerToUrl(walletAddressOrPointer);
		}

		const walletAddress = await this.request<WalletAddress>({
			method: 'GET',
			url,
			headers: {
				'Accept': 'application/json',
			},
		});

		this.walletAddress = walletAddress;
		return walletAddress;
	}

	/**
	 * Get wallet address keys (JWKS)
	 */
	async getWalletAddressKeys(walletAddressUrl: string): Promise<{ keys: unknown[] }> {
		return this.request<{ keys: unknown[] }>({
			method: 'GET',
			url: `${walletAddressUrl}/jwks.json`,
		});
	}

	// ===================
	// Incoming Payment Operations
	// ===================

	/**
	 * Create incoming payment
	 */
	async createIncomingPayment(
		walletAddressUrl: string,
		params: {
			incomingAmount?: Amount;
			expiresAt?: string;
			metadata?: Record<string, unknown>;
		},
		accessToken: string,
	): Promise<IncomingPayment> {
		return this.request<IncomingPayment>(
			{
				method: 'POST',
				url: `${walletAddressUrl}/incoming-payments`,
				data: {
					walletAddress: walletAddressUrl,
					incomingAmount: params.incomingAmount,
					expiresAt: params.expiresAt,
					metadata: params.metadata,
				},
			},
			accessToken,
		);
	}

	/**
	 * Get incoming payment by ID
	 */
	async getIncomingPayment(paymentUrl: string, accessToken: string): Promise<IncomingPayment> {
		return this.request<IncomingPayment>(
			{
				method: 'GET',
				url: paymentUrl,
			},
			accessToken,
		);
	}

	/**
	 * List incoming payments
	 */
	async listIncomingPayments(
		walletAddressUrl: string,
		params: {
			cursor?: string;
			first?: number;
			last?: number;
		},
		accessToken: string,
	): Promise<{ result: IncomingPayment[]; pagination: { hasNextPage: boolean; hasPrevPage: boolean; startCursor?: string; endCursor?: string } }> {
		const queryParams = new URLSearchParams();
		if (params.cursor) queryParams.set('cursor', params.cursor);
		if (params.first) queryParams.set('first', params.first.toString());
		if (params.last) queryParams.set('last', params.last.toString());

		const queryString = queryParams.toString();
		const url = `${walletAddressUrl}/incoming-payments${queryString ? `?${queryString}` : ''}`;

		return this.request(
			{
				method: 'GET',
				url,
			},
			accessToken,
		);
	}

	/**
	 * Complete incoming payment
	 */
	async completeIncomingPayment(paymentUrl: string, accessToken: string): Promise<IncomingPayment> {
		return this.request<IncomingPayment>(
			{
				method: 'POST',
				url: `${paymentUrl}/complete`,
			},
			accessToken,
		);
	}

	// ===================
	// Outgoing Payment Operations
	// ===================

	/**
	 * Create outgoing payment
	 */
	async createOutgoingPayment(
		walletAddressUrl: string,
		params: {
			quoteId: string;
			metadata?: Record<string, unknown>;
		},
		accessToken: string,
	): Promise<OutgoingPayment> {
		return this.request<OutgoingPayment>(
			{
				method: 'POST',
				url: `${walletAddressUrl}/outgoing-payments`,
				data: {
					walletAddress: walletAddressUrl,
					quoteId: params.quoteId,
					metadata: params.metadata,
				},
			},
			accessToken,
		);
	}

	/**
	 * Get outgoing payment by ID
	 */
	async getOutgoingPayment(paymentUrl: string, accessToken: string): Promise<OutgoingPayment> {
		return this.request<OutgoingPayment>(
			{
				method: 'GET',
				url: paymentUrl,
			},
			accessToken,
		);
	}

	/**
	 * List outgoing payments
	 */
	async listOutgoingPayments(
		walletAddressUrl: string,
		params: {
			cursor?: string;
			first?: number;
			last?: number;
		},
		accessToken: string,
	): Promise<{ result: OutgoingPayment[]; pagination: { hasNextPage: boolean; hasPrevPage: boolean; startCursor?: string; endCursor?: string } }> {
		const queryParams = new URLSearchParams();
		if (params.cursor) queryParams.set('cursor', params.cursor);
		if (params.first) queryParams.set('first', params.first.toString());
		if (params.last) queryParams.set('last', params.last.toString());

		const queryString = queryParams.toString();
		const url = `${walletAddressUrl}/outgoing-payments${queryString ? `?${queryString}` : ''}`;

		return this.request(
			{
				method: 'GET',
				url,
			},
			accessToken,
		);
	}

	// ===================
	// Quote Operations
	// ===================

	/**
	 * Create quote for payment
	 */
	async createQuote(
		walletAddressUrl: string,
		params: {
			receiver: string;
			debitAmount?: Amount;
			receiveAmount?: Amount;
		},
		accessToken: string,
	): Promise<Quote> {
		return this.request<Quote>(
			{
				method: 'POST',
				url: `${walletAddressUrl}/quotes`,
				data: {
					walletAddress: walletAddressUrl,
					receiver: params.receiver,
					debitAmount: params.debitAmount,
					receiveAmount: params.receiveAmount,
				},
			},
			accessToken,
		);
	}

	/**
	 * Get quote by ID
	 */
	async getQuote(quoteUrl: string, accessToken: string): Promise<Quote> {
		return this.request<Quote>(
			{
				method: 'GET',
				url: quoteUrl,
			},
			accessToken,
		);
	}

	// ===================
	// Grant Operations (GNAP)
	// ===================

	/**
	 * Request grant from authorization server
	 */
	async requestGrant(
		authServerUrl: string,
		grantRequest: GrantRequest,
	): Promise<Grant> {
		return this.request<Grant>({
			method: 'POST',
			url: authServerUrl,
			data: grantRequest,
		});
	}

	/**
	 * Continue grant flow
	 */
	async continueGrant(
		continueUrl: string,
		continueAccessToken: string,
		interactRef?: string,
	): Promise<Grant> {
		return this.request<Grant>(
			{
				method: 'POST',
				url: continueUrl,
				data: interactRef ? { interact_ref: interactRef } : undefined,
			},
			continueAccessToken,
		);
	}

	/**
	 * Cancel/revoke grant
	 */
	async revokeGrant(manageUrl: string, accessToken: string): Promise<void> {
		await this.request<void>(
			{
				method: 'DELETE',
				url: manageUrl,
			},
			accessToken,
		);
	}

	/**
	 * Rotate access token
	 */
	async rotateToken(manageUrl: string, accessToken: string): Promise<Grant> {
		return this.request<Grant>(
			{
				method: 'POST',
				url: manageUrl,
			},
			accessToken,
		);
	}

	// ===================
	// Helper Methods
	// ===================

	/**
	 * Build grant request for incoming payments
	 */
	buildIncomingPaymentGrantRequest(
		walletAddressUrl: string,
		actions: string[] = ['create', 'read', 'complete', 'list'],
	): GrantRequest {
		return {
			access_token: {
				access: [
					{
						type: 'incoming-payment',
						actions: actions as GrantAccess['actions'],
						identifier: walletAddressUrl,
					},
				],
			},
			client: this.config.walletAddressUrl,
		};
	}

	/**
	 * Build grant request for outgoing payments
	 */
	buildOutgoingPaymentGrantRequest(
		walletAddressUrl: string,
		actions: string[] = ['create', 'read', 'list'],
		limits?: {
			receiver?: string;
			debitAmount?: Amount;
			receiveAmount?: Amount;
		},
	): GrantRequest {
		const access: GrantAccess = {
			type: 'outgoing-payment',
			actions: actions as GrantAccess['actions'],
			identifier: walletAddressUrl,
		};

		if (limits) {
			access.limits = limits;
		}

		return {
			access_token: {
				access: [access],
			},
			client: this.config.walletAddressUrl,
		};
	}

	/**
	 * Build grant request for quotes
	 */
	buildQuoteGrantRequest(
		walletAddressUrl: string,
		actions: string[] = ['create', 'read'],
	): GrantRequest {
		return {
			access_token: {
				access: [
					{
						type: 'quote',
						actions: actions as GrantAccess['actions'],
						identifier: walletAddressUrl,
					},
				],
			},
			client: this.config.walletAddressUrl,
		};
	}

	/**
	 * Resolve receiver wallet address for payment
	 */
	async resolveReceiver(receiverPointer: string): Promise<WalletAddress> {
		return this.getWalletAddress(receiverPointer);
	}

	/**
	 * Execute full payment flow: quote -> grant -> payment
	 */
	async sendPayment(
		params: {
			receiver: string;
			amount: Amount;
			metadata?: Record<string, unknown>;
		},
	): Promise<OutgoingPayment> {
		// Get sender wallet address if not cached
		if (!this.walletAddress) {
			this.walletAddress = await this.getWalletAddress(this.config.walletAddressUrl);
		}

		// Check for existing access tokens
		const quoteAccessToken = this.config.accessTokens?.quote;
		const outgoingAccessToken = this.config.accessTokens?.outgoing;

		if (!quoteAccessToken || !outgoingAccessToken) {
			throw new Error('Quote and outgoing payment access tokens are required for sendPayment. Request grants first.');
		}

		// Create quote
		const quote = await this.createQuote(
			this.walletAddress.id,
			{
				receiver: params.receiver,
				receiveAmount: params.amount,
			},
			quoteAccessToken,
		);

		// Create outgoing payment from quote
		const payment = await this.createOutgoingPayment(
			this.walletAddress.id,
			{
				quoteId: quote.id,
				metadata: params.metadata,
			},
			outgoingAccessToken,
		);

		return payment;
	}
}

export default OpenPaymentsClient;
