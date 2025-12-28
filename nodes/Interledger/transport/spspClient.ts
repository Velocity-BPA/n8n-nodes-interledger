/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';
import {
  parsePaymentPointer,
  paymentPointerToUrl,
  validatePaymentPointer,
} from '../utils/paymentPointerUtils';
import { StreamClient } from './streamClient';

/**
 * SPSP Client
 *
 * Simple Payment Setup Protocol (SPSP) is a protocol for exchanging
 * payment information before initiating an Interledger payment.
 *
 * SPSP uses payment pointers ($wallet.example.com/alice) to look up
 * payment details including the destination account and shared secret
 * needed to establish a STREAM connection.
 *
 * Flow:
 * 1. Sender resolves payment pointer to SPSP endpoint
 * 2. Sender queries SPSP endpoint for payment details
 * 3. Sender uses details to establish STREAM connection
 * 4. Payment is sent via STREAM
 */

export interface SpspCredentials {
  paymentPointer?: string;
  receiverEndpoint?: string;
  sharedSecret?: string;
  destinationAccount?: string;
  assetCode?: string;
  assetScale?: number;
  timeout?: number;
}

export interface SpspResponse {
  destination_account: string;
  shared_secret: string;
  receipts_enabled?: boolean;
}

export interface SpspPaymentDetails {
  destinationAccount: string;
  sharedSecret: string;
  receiptsEnabled: boolean;
  assetCode?: string;
  assetScale?: number;
}

export interface SpspPaymentOptions {
  amount: string;
  assetCode?: string;
  assetScale?: number;
  timeout?: number;
  slippage?: number;
}

export interface SpspPaymentResult {
  success: boolean;
  sourceAmount: string;
  destinationAmount: string;
  paymentPointer: string;
  destinationAccount: string;
  exchangeRate: number;
  duration: number;
}

export class SpspClient {
  private credentials: SpspCredentials;
  private httpClient: AxiosInstance;
  private streamClient: StreamClient | null = null;

  constructor(credentials: SpspCredentials) {
    this.credentials = credentials;

    this.httpClient = axios.create({
      timeout: credentials.timeout ?? 30000,
      headers: {
        Accept: 'application/spsp4+json, application/spsp+json',
      },
    });
  }

  /**
   * Query an SPSP endpoint to get payment details
   */
  async queryEndpoint(paymentPointer: string): Promise<SpspPaymentDetails> {
    // Validate payment pointer
    const validation = validatePaymentPointer(paymentPointer);
    if (!validation.valid) {
      throw new Error(`Invalid payment pointer: ${validation.error}`);
    }

    // Convert payment pointer to URL
    const spspUrl = paymentPointerToUrl(paymentPointer);

    try {
      const response = await this.httpClient.get<SpspResponse>(spspUrl, {
        headers: {
          Accept: 'application/spsp4+json, application/spsp+json',
        },
      });

      return {
        destinationAccount: response.data.destination_account,
        sharedSecret: response.data.shared_secret,
        receiptsEnabled: response.data.receipts_enabled ?? false,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new Error(`Payment pointer not found: ${paymentPointer}`);
        }
        throw new Error(
          `SPSP query failed: ${axiosError.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Send a payment using SPSP
   */
  async sendPayment(
    paymentPointer: string,
    options: SpspPaymentOptions,
  ): Promise<SpspPaymentResult> {
    const startTime = Date.now();

    // Query SPSP endpoint
    const details = await this.queryEndpoint(paymentPointer);

    // Create STREAM client if not exists
    if (!this.streamClient) {
      this.streamClient = new StreamClient({
        assetCode: options.assetCode ?? this.credentials.assetCode,
        assetScale: options.assetScale ?? this.credentials.assetScale,
      });
    }

    // Create STREAM connection
    const connection = await this.streamClient.createConnection({
      destinationAccount: details.destinationAccount,
      sharedSecret: details.sharedSecret,
    });

    try {
      // Send payment via STREAM
      const result = await this.streamClient.sendPayment(connection.id, {
        sourceAmount: options.amount,
        timeout: options.timeout,
        slippage: options.slippage,
      });

      return {
        success: true,
        sourceAmount: result.sourceAmount,
        destinationAmount: result.destinationAmount,
        paymentPointer,
        destinationAccount: details.destinationAccount,
        exchangeRate: result.exchangeRate,
        duration: Date.now() - startTime,
      };
    } finally {
      // Close connection
      await this.streamClient.closeConnection(connection.id);
    }
  }

  /**
   * Get SPSP response (raw)
   */
  async getSpspResponse(paymentPointer: string): Promise<SpspResponse> {
    const spspUrl = paymentPointerToUrl(paymentPointer);

    const response = await this.httpClient.get<SpspResponse>(spspUrl);
    return response.data;
  }

  /**
   * Get destination details from payment pointer
   */
  async getDestinationDetails(paymentPointer: string): Promise<{
    destinationAccount: string;
    host: string;
    path: string;
    spspEndpoint: string;
  }> {
    const parsed = parsePaymentPointer(paymentPointer);
    const details = await this.queryEndpoint(paymentPointer);

    return {
      destinationAccount: details.destinationAccount,
      host: parsed?.host ?? '',
      path: parsed?.path ?? '',
      spspEndpoint: paymentPointerToUrl(paymentPointer),
    };
  }

  /**
   * Get shared secret for a payment pointer
   */
  async getSharedSecret(paymentPointer: string): Promise<string> {
    const details = await this.queryEndpoint(paymentPointer);
    return details.sharedSecret;
  }

  /**
   * Get destination account for a payment pointer
   */
  async getDestinationAccount(paymentPointer: string): Promise<string> {
    const details = await this.queryEndpoint(paymentPointer);
    return details.destinationAccount;
  }

  /**
   * Resolve a payment pointer to its metadata
   */
  async resolvePaymentPointer(paymentPointer: string): Promise<{
    valid: boolean;
    host: string;
    path: string;
    spspUrl: string;
    destinationAccount?: string;
    sharedSecret?: string;
    receiptsEnabled?: boolean;
    error?: string;
  }> {
    const validation = validatePaymentPointer(paymentPointer);
    if (!validation.valid) {
      return {
        valid: false,
        host: '',
        path: '',
        spspUrl: '',
        error: validation.error,
      };
    }

    const parsed = parsePaymentPointer(paymentPointer);
    const spspUrl = paymentPointerToUrl(paymentPointer);

    try {
      const details = await this.queryEndpoint(paymentPointer);
      return {
        valid: true,
        host: parsed?.host ?? '',
        path: parsed?.path ?? '',
        spspUrl,
        destinationAccount: details.destinationAccount,
        sharedSecret: details.sharedSecret,
        receiptsEnabled: details.receiptsEnabled,
      };
    } catch (error) {
      return {
        valid: false,
        host: parsed?.host ?? '',
        path: parsed?.path ?? '',
        spspUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate SPSP receiver credentials
   * Used when acting as a receiver
   */
  generateReceiverCredentials(): {
    destinationAccount: string;
    sharedSecret: string;
    receiptsEnabled: boolean;
  } {
    const sharedSecret = crypto.randomBytes(32).toString('base64');
    const destinationAccount = this.credentials.destinationAccount
      ?? `g.example.receiver.${crypto.randomBytes(8).toString('hex')}`;

    return {
      destinationAccount,
      sharedSecret,
      receiptsEnabled: false,
    };
  }

  /**
   * Create an SPSP response for a receiver
   */
  createSpspResponse(options?: {
    destinationAccount?: string;
    sharedSecret?: string;
    receiptsEnabled?: boolean;
  }): SpspResponse {
    const credentials = this.generateReceiverCredentials();

    return {
      destination_account: options?.destinationAccount ?? credentials.destinationAccount,
      shared_secret: options?.sharedSecret ?? credentials.sharedSecret,
      receipts_enabled: options?.receiptsEnabled ?? false,
    };
  }

  /**
   * Validate that a payment pointer is reachable
   */
  async validatePaymentPointer(paymentPointer: string): Promise<{
    valid: boolean;
    reachable: boolean;
    error?: string;
  }> {
    const validation = validatePaymentPointer(paymentPointer);
    if (!validation.valid) {
      return {
        valid: false,
        reachable: false,
        error: validation.error,
      };
    }

    try {
      await this.queryEndpoint(paymentPointer);
      return {
        valid: true,
        reachable: true,
      };
    } catch (error) {
      return {
        valid: true,
        reachable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment pointer metadata (Open Payments style)
   */
  async getPaymentPointerMetadata(paymentPointer: string): Promise<{
    id: string;
    publicName?: string;
    assetCode?: string;
    assetScale?: number;
    authServer?: string;
  }> {
    const parsed = parsePaymentPointer(paymentPointer);
    const baseUrl = `https://${parsed?.host}`;

    try {
      // Try to fetch Open Payments wallet address metadata
      const response = await this.httpClient.get(`${baseUrl}/.well-known/pay${parsed?.path ?? ''}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      return {
        id: response.data.id ?? paymentPointer,
        publicName: response.data.publicName,
        assetCode: response.data.assetCode,
        assetScale: response.data.assetScale,
        authServer: response.data.authServer,
      };
    } catch {
      // Fall back to basic SPSP
      return {
        id: paymentPointer,
      };
    }
  }

  /**
   * Probe a payment pointer to check connectivity and get rate info
   */
  async probePaymentPointer(
    paymentPointer: string,
    probeAmount: string = '1000000',
  ): Promise<{
    reachable: boolean;
    destinationAccount?: string;
    estimatedRate?: number;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const details = await this.queryEndpoint(paymentPointer);
      const latency = Date.now() - startTime;

      return {
        reachable: true,
        destinationAccount: details.destinationAccount,
        latency,
        // Rate estimation would require sending probe packets
        estimatedRate: 1.0,
      };
    } catch (error) {
      return {
        reachable: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default SpspClient;
