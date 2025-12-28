/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { STREAM_FRAME_TYPES } from '../constants/packetTypes';
import { generateConditionAndFulfillment } from '../utils/packetUtils';

/**
 * STREAM Client
 *
 * STREAM (Scalable Transport for Real-time Exchange of Assets and Messages)
 * is a multiplexed transport protocol over ILP for sending payments and data.
 *
 * Key concepts:
 * - Connections: A STREAM connection is established between sender and receiver
 * - Streams: Multiple streams can be multiplexed over a single connection
 * - Frames: Data is sent in frames (money, data, close, etc.)
 * - Shared Secret: Used to encrypt and decrypt STREAM packets
 */

export interface StreamCredentials {
  paymentPointer?: string;
  destinationAccount?: string;
  sharedSecret?: string;
  connectorUrl?: string;
  assetCode?: string;
  assetScale?: number;
}

export interface StreamConnection {
  id: string;
  destinationAccount: string;
  sharedSecret: Buffer;
  state: 'open' | 'closing' | 'closed';
  moneySent: bigint;
  moneyReceived: bigint;
  dataBytesSent: number;
  dataBytesReceived: number;
  streams: Map<number, StreamInfo>;
  createdAt: Date;
}

export interface StreamInfo {
  id: number;
  state: 'open' | 'closing' | 'closed';
  sendMax: bigint;
  receiveMax: bigint;
  sent: bigint;
  received: bigint;
}

export interface StreamFrame {
  type: number;
  data: Buffer;
}

export interface StreamPaymentOptions {
  sourceAmount?: string;
  destinationAmount?: string;
  timeout?: number;
  slippage?: number;
}

export interface StreamPaymentResult {
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: number;
  duration: number;
  packetsSent: number;
  packetsDelivered: number;
  packetsFailed: number;
}

export class StreamClient {
  private credentials: StreamCredentials;
  private httpClient: AxiosInstance;
  private connections: Map<string, StreamConnection>;
  private nextStreamId: number;

  constructor(credentials: StreamCredentials) {
    this.credentials = credentials;
    this.connections = new Map();
    this.nextStreamId = 1;

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  }

  /**
   * Create a new STREAM connection
   */
  async createConnection(options: {
    destinationAccount: string;
    sharedSecret: string | Buffer;
  }): Promise<StreamConnection> {
    const connectionId = crypto.randomUUID();
    const sharedSecret = typeof options.sharedSecret === 'string'
      ? Buffer.from(options.sharedSecret, 'base64')
      : options.sharedSecret;

    const connection: StreamConnection = {
      id: connectionId,
      destinationAccount: options.destinationAccount,
      sharedSecret,
      state: 'open',
      moneySent: 0n,
      moneyReceived: 0n,
      dataBytesSent: 0,
      dataBytesReceived: 0,
      streams: new Map(),
      createdAt: new Date(),
    };

    this.connections.set(connectionId, connection);
    return connection;
  }

  /**
   * Get an existing connection
   */
  getConnection(connectionId: string): StreamConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Close a STREAM connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    connection.state = 'closing';

    // Close all open streams
    for (const stream of connection.streams.values()) {
      stream.state = 'closed';
    }

    connection.state = 'closed';
  }

  /**
   * Create a new stream on a connection
   */
  createStream(connectionId: string): StreamInfo {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.state !== 'open') {
      throw new Error('Cannot create stream on closed connection');
    }

    const streamId = this.nextStreamId++;
    const stream: StreamInfo = {
      id: streamId,
      state: 'open',
      sendMax: 0n,
      receiveMax: BigInt(Number.MAX_SAFE_INTEGER),
      sent: 0n,
      received: 0n,
    };

    connection.streams.set(streamId, stream);
    return stream;
  }

  /**
   * Send payment via STREAM
   */
  async sendPayment(
    connectionId: string,
    options: StreamPaymentOptions,
  ): Promise<StreamPaymentResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.state !== 'open') {
      throw new Error('Cannot send payment on closed connection');
    }

    const startTime = Date.now();
    const timeout = options.timeout ?? 30000;
    const slippage = options.slippage ?? 0.01; // 1% default slippage

    let sourceAmountSent = 0n;
    let destinationAmountReceived = 0n;
    let packetsSent = 0;
    let packetsDelivered = 0;
    let packetsFailed = 0;

    const sourceAmount = options.sourceAmount
      ? BigInt(options.sourceAmount)
      : undefined;
    const destinationAmount = options.destinationAmount
      ? BigInt(options.destinationAmount)
      : undefined;

    // Determine payment strategy
    if (!sourceAmount && !destinationAmount) {
      throw new Error('Either sourceAmount or destinationAmount must be specified');
    }

    // Simulate STREAM payment packets
    // In a real implementation, this would send actual ILP packets
    const packetAmount = 1000000n; // 1 unit in typical scale
    const maxPackets = 1000;

    for (let i = 0; i < maxPackets; i++) {
      if (Date.now() - startTime > timeout) {
        break;
      }

      // Check if we've reached the target amount
      if (sourceAmount && sourceAmountSent >= sourceAmount) {
        break;
      }
      if (destinationAmount && destinationAmountReceived >= destinationAmount) {
        break;
      }

      // Simulate packet sending
      const { condition, fulfillment } = generateConditionAndFulfillment();

      try {
        // In a real implementation, this would send an ILP packet
        // and wait for a fulfillment or rejection
        const success = Math.random() > 0.05; // 95% success rate simulation

        packetsSent++;

        if (success) {
          packetsDelivered++;
          sourceAmountSent += packetAmount;
          // Simulate exchange rate (approximately 1:1 for same asset)
          destinationAmountReceived += packetAmount;
          connection.moneySent += packetAmount;
        } else {
          packetsFailed++;
        }
      } catch (error) {
        packetsFailed++;
      }
    }

    const exchangeRate = sourceAmountSent > 0n
      ? Number(destinationAmountReceived) / Number(sourceAmountSent)
      : 0;

    return {
      sourceAmount: sourceAmountSent.toString(),
      destinationAmount: destinationAmountReceived.toString(),
      exchangeRate,
      duration: Date.now() - startTime,
      packetsSent,
      packetsDelivered,
      packetsFailed,
    };
  }

  /**
   * Receive payment via STREAM (for receiver side)
   */
  async receivePayment(connectionId: string): Promise<{
    amountReceived: string;
    assetCode: string;
    assetScale: number;
  }> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    return {
      amountReceived: connection.moneyReceived.toString(),
      assetCode: this.credentials.assetCode ?? 'USD',
      assetScale: this.credentials.assetScale ?? 2,
    };
  }

  /**
   * Get connection state
   */
  getConnectionState(connectionId: string): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection.state;
  }

  /**
   * Get shared secret for a connection
   */
  getSharedSecret(connectionId: string): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection.sharedSecret.toString('base64');
  }

  /**
   * Get money received on a connection
   */
  getMoneyReceived(connectionId: string): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection.moneyReceived.toString();
  }

  /**
   * Get money sent on a connection
   */
  getMoneySent(connectionId: string): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection.moneySent.toString();
  }

  /**
   * Encrypt STREAM packet data
   */
  private encryptPacket(connection: StreamConnection, data: Buffer): Buffer {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.deriveKey(connection.sharedSecret, 'aes_key'),
      nonce,
    );

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([nonce, authTag, encrypted]);
  }

  /**
   * Decrypt STREAM packet data
   */
  private decryptPacket(connection: StreamConnection, data: Buffer): Buffer {
    const nonce = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const encrypted = data.subarray(28);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.deriveKey(connection.sharedSecret, 'aes_key'),
      nonce,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Derive encryption key from shared secret
   */
  private deriveKey(sharedSecret: Buffer, purpose: string): Buffer {
    return crypto
      .createHmac('sha256', sharedSecret)
      .update(purpose)
      .digest();
  }

  /**
   * Create a STREAM frame
   */
  createFrame(type: number, data: Buffer = Buffer.alloc(0)): StreamFrame {
    return { type, data };
  }

  /**
   * Create a ConnectionClose frame
   */
  createCloseFrame(errorCode: number = 0, errorMessage: string = ''): StreamFrame {
    const message = Buffer.from(errorMessage, 'utf8');
    const data = Buffer.alloc(4 + message.length);
    data.writeUInt32BE(errorCode, 0);
    message.copy(data, 4);

    return {
      type: STREAM_FRAME_TYPES.CONNECTION_CLOSE,
      data,
    };
  }

  /**
   * Create a StreamMoney frame
   */
  createMoneyFrame(streamId: number, shares: bigint): StreamFrame {
    const data = Buffer.alloc(12);
    data.writeUInt32BE(streamId, 0);
    data.writeBigUInt64BE(shares, 4);

    return {
      type: STREAM_FRAME_TYPES.STREAM_MONEY,
      data,
    };
  }

  /**
   * Create a StreamData frame
   */
  createDataFrame(streamId: number, offset: bigint, payload: Buffer): StreamFrame {
    const data = Buffer.alloc(12 + payload.length);
    data.writeUInt32BE(streamId, 0);
    data.writeBigUInt64BE(offset, 4);
    payload.copy(data, 12);

    return {
      type: STREAM_FRAME_TYPES.STREAM_DATA,
      data,
    };
  }

  /**
   * Serialize frames to packet data
   */
  serializeFrames(frames: StreamFrame[]): Buffer {
    const buffers: Buffer[] = [];

    for (const frame of frames) {
      const header = Buffer.alloc(3);
      header.writeUInt8(frame.type, 0);
      header.writeUInt16BE(frame.data.length, 1);
      buffers.push(header);
      buffers.push(frame.data);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Parse frames from packet data
   */
  parseFrames(data: Buffer): StreamFrame[] {
    const frames: StreamFrame[] = [];
    let offset = 0;

    while (offset < data.length) {
      const type = data.readUInt8(offset);
      const length = data.readUInt16BE(offset + 1);
      const frameData = data.subarray(offset + 3, offset + 3 + length);

      frames.push({ type, data: frameData });
      offset += 3 + length;
    }

    return frames;
  }

  /**
   * Generate STREAM credentials for receiving
   */
  generateReceiveCredentials(): {
    destinationAccount: string;
    sharedSecret: string;
  } {
    const sharedSecret = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(18);

    // Generate destination account with embedded connection token
    const baseAccount = this.credentials.destinationAccount ?? 'g.example.receiver';
    const token = nonce.toString('base64url');
    const destinationAccount = `${baseAccount}~${token}`;

    return {
      destinationAccount,
      sharedSecret: sharedSecret.toString('base64'),
    };
  }

  /**
   * List all connections
   */
  listConnections(): StreamConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    openConnections: number;
    closedConnections: number;
    totalMoneySent: string;
    totalMoneyReceived: string;
  } {
    let openConnections = 0;
    let closedConnections = 0;
    let totalMoneySent = 0n;
    let totalMoneyReceived = 0n;

    for (const connection of this.connections.values()) {
      if (connection.state === 'open') {
        openConnections++;
      } else {
        closedConnections++;
      }
      totalMoneySent += connection.moneySent;
      totalMoneyReceived += connection.moneyReceived;
    }

    return {
      totalConnections: this.connections.size,
      openConnections,
      closedConnections,
      totalMoneySent: totalMoneySent.toString(),
      totalMoneyReceived: totalMoneyReceived.toString(),
    };
  }
}

export default StreamClient;
