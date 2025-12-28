/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ILP_ADDRESS_PREFIXES } from '../constants/addresses';
import { PROTOCOL_VERSIONS } from '../constants';

/**
 * Connector Client
 *
 * ILP Connectors are nodes in the Interledger network that route payments
 * between different ledgers. They maintain routing tables, manage peers,
 * and handle liquidity.
 *
 * Key concepts:
 * - Peers: Other connectors this connector is connected to
 * - Routes: Paths to reach destination addresses
 * - Liquidity: Funds available for routing payments
 * - Accounts: Ledger positions with peers
 */

export interface ConnectorCredentials {
  connectorUrl: string;
  adminApiKey?: string;
  authMethod?: 'apiKey' | 'bearer' | 'none';
  ilpAddress?: string;
  timeout?: number;
}

export interface PeerInfo {
  id: string;
  ilpAddress: string;
  relation: 'peer' | 'parent' | 'child';
  assetCode: string;
  assetScale: number;
  balance: string;
  minBalance?: string;
  maxPacketAmount?: string;
  rateLimit?: number;
  state: 'connected' | 'disconnected' | 'error';
  lastSeen?: Date;
}

export interface RouteInfo {
  prefix: string;
  path: string[];
  peer: string;
  weight: number;
  isLocal: boolean;
  expiresAt?: Date;
}

export interface AccountInfo {
  id: string;
  ilpAddress: string;
  assetCode: string;
  assetScale: number;
  balance: string;
  prepaidBalance: string;
  payableBalance: string;
  isAdmin: boolean;
  maxPacketAmount?: string;
}

export interface ConnectorInfo {
  name: string;
  version: string;
  ilpAddress: string;
  assetCode: string;
  assetScale: number;
  peers: number;
  routes: number;
  uptime: number;
  features: string[];
  protocols: string[];
}

export interface LiquidityInfo {
  assetCode: string;
  assetScale: number;
  available: string;
  reserved: string;
  total: string;
}

export class ConnectorClient {
  private credentials: ConnectorCredentials;
  private httpClient: AxiosInstance;

  constructor(credentials: ConnectorCredentials) {
    this.credentials = credentials;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.authMethod === 'apiKey' && credentials.adminApiKey) {
      headers['X-API-Key'] = credentials.adminApiKey;
    } else if (credentials.authMethod === 'bearer' && credentials.adminApiKey) {
      headers['Authorization'] = `Bearer ${credentials.adminApiKey}`;
    }

    this.httpClient = axios.create({
      baseURL: credentials.connectorUrl,
      timeout: credentials.timeout ?? 30000,
      headers,
    });
  }

  /**
   * Get connector information
   */
  async getInfo(): Promise<ConnectorInfo> {
    try {
      const response = await this.httpClient.get('/');
      return {
        name: response.data.name ?? 'ILP Connector',
        version: response.data.version ?? '1.0.0',
        ilpAddress: response.data.ilpAddress ?? this.credentials.ilpAddress ?? '',
        assetCode: response.data.assetCode ?? 'USD',
        assetScale: response.data.assetScale ?? 2,
        peers: response.data.peers ?? 0,
        routes: response.data.routes ?? 0,
        uptime: response.data.uptime ?? 0,
        features: response.data.features ?? [],
        protocols: response.data.protocols ?? ['ilp', 'stream', 'spsp'],
      };
    } catch (error) {
      // Return default info if endpoint not available
      return {
        name: 'ILP Connector',
        version: PROTOCOL_VERSIONS.ILP.toString(),
        ilpAddress: this.credentials.ilpAddress ?? '',
        assetCode: 'USD',
        assetScale: 2,
        peers: 0,
        routes: 0,
        uptime: 0,
        features: [],
        protocols: ['ilp', 'stream', 'spsp'],
      };
    }
  }

  /**
   * Get all routes
   */
  async getRoutes(): Promise<RouteInfo[]> {
    const response = await this.httpClient.get('/routes');
    return response.data.routes ?? response.data;
  }

  /**
   * Add a route
   */
  async addRoute(route: {
    prefix: string;
    peer: string;
    weight?: number;
  }): Promise<RouteInfo> {
    const response = await this.httpClient.post('/routes', {
      prefix: route.prefix,
      peer: route.peer,
      weight: route.weight ?? 100,
    });
    return response.data;
  }

  /**
   * Delete a route
   */
  async deleteRoute(prefix: string): Promise<void> {
    await this.httpClient.delete(`/routes/${encodeURIComponent(prefix)}`);
  }

  /**
   * Get best route for a destination
   */
  async getBestRoute(destination: string): Promise<RouteInfo | null> {
    try {
      const response = await this.httpClient.get(`/routes/lookup/${encodeURIComponent(destination)}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get route table
   */
  async getRouteTable(): Promise<Map<string, RouteInfo>> {
    const routes = await this.getRoutes();
    const table = new Map<string, RouteInfo>();
    for (const route of routes) {
      table.set(route.prefix, route);
    }
    return table;
  }

  /**
   * Get all peers
   */
  async getPeers(): Promise<PeerInfo[]> {
    const response = await this.httpClient.get('/peers');
    return response.data.peers ?? response.data;
  }

  /**
   * Get a specific peer
   */
  async getPeer(peerId: string): Promise<PeerInfo> {
    const response = await this.httpClient.get(`/peers/${peerId}`);
    return response.data;
  }

  /**
   * Add a peer
   */
  async addPeer(peer: {
    id?: string;
    ilpAddress: string;
    relation: 'peer' | 'parent' | 'child';
    assetCode: string;
    assetScale: number;
    endpoint?: string;
    auth?: {
      type: 'simple' | 'token';
      token?: string;
    };
    maxPacketAmount?: string;
    minBalance?: string;
    rateLimit?: number;
  }): Promise<PeerInfo> {
    const response = await this.httpClient.post('/peers', peer);
    return response.data;
  }

  /**
   * Update a peer
   */
  async updatePeer(peerId: string, updates: Partial<PeerInfo>): Promise<PeerInfo> {
    const response = await this.httpClient.patch(`/peers/${peerId}`, updates);
    return response.data;
  }

  /**
   * Remove a peer
   */
  async removePeer(peerId: string): Promise<void> {
    await this.httpClient.delete(`/peers/${peerId}`);
  }

  /**
   * Get peer status
   */
  async getPeerStatus(peerId: string): Promise<{
    connected: boolean;
    lastSeen?: Date;
    packetsReceived: number;
    packetsSent: number;
    bytesReceived: number;
    bytesSent: number;
  }> {
    const response = await this.httpClient.get(`/peers/${peerId}/status`);
    return response.data;
  }

  /**
   * Test peer connection
   */
  async testPeerConnection(peerId: string): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const response = await this.httpClient.post(`/peers/${peerId}/ping`);
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get peer balance
   */
  async getPeerBalance(peerId: string): Promise<{
    balance: string;
    minBalance: string;
    maxBalance: string;
    prepaidBalance: string;
  }> {
    const response = await this.httpClient.get(`/peers/${peerId}/balance`);
    return response.data;
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<AccountInfo[]> {
    const response = await this.httpClient.get('/accounts');
    return response.data.accounts ?? response.data;
  }

  /**
   * Get a specific account
   */
  async getAccount(accountId: string): Promise<AccountInfo> {
    const response = await this.httpClient.get(`/accounts/${accountId}`);
    return response.data;
  }

  /**
   * Create an account
   */
  async createAccount(account: {
    id?: string;
    ilpAddress?: string;
    assetCode: string;
    assetScale: number;
    maxPacketAmount?: string;
  }): Promise<AccountInfo> {
    const response = await this.httpClient.post('/accounts', account);
    return response.data;
  }

  /**
   * Update an account
   */
  async updateAccount(accountId: string, updates: Partial<AccountInfo>): Promise<AccountInfo> {
    const response = await this.httpClient.patch(`/accounts/${accountId}`, updates);
    return response.data;
  }

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string): Promise<void> {
    await this.httpClient.delete(`/accounts/${accountId}`);
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<{
    balance: string;
    prepaidBalance: string;
    payableBalance: string;
  }> {
    const response = await this.httpClient.get(`/accounts/${accountId}/balance`);
    return response.data;
  }

  /**
   * Get liquidity
   */
  async getLiquidity(): Promise<LiquidityInfo[]> {
    const response = await this.httpClient.get('/liquidity');
    return response.data.liquidity ?? response.data;
  }

  /**
   * Get liquidity for a specific asset
   */
  async getLiquidityForAsset(assetCode: string): Promise<LiquidityInfo> {
    const response = await this.httpClient.get(`/liquidity/${assetCode}`);
    return response.data;
  }

  /**
   * Add liquidity
   */
  async addLiquidity(options: {
    assetCode: string;
    amount: string;
    peerId?: string;
  }): Promise<{
    success: boolean;
    newBalance: string;
  }> {
    const response = await this.httpClient.post('/liquidity/add', options);
    return response.data;
  }

  /**
   * Remove liquidity
   */
  async removeLiquidity(options: {
    assetCode: string;
    amount: string;
    peerId?: string;
  }): Promise<{
    success: boolean;
    newBalance: string;
  }> {
    const response = await this.httpClient.post('/liquidity/remove', options);
    return response.data;
  }

  /**
   * Get connector balance
   */
  async getBalance(): Promise<{
    total: string;
    available: string;
    reserved: string;
    byAsset: Array<{
      assetCode: string;
      balance: string;
    }>;
  }> {
    const response = await this.httpClient.get('/balance');
    return response.data;
  }

  /**
   * Get exchange rate
   */
  async getRate(sourceAsset: string, destinationAsset: string): Promise<{
    rate: number;
    sourceAsset: string;
    destinationAsset: string;
    timestamp: Date;
  }> {
    const response = await this.httpClient.get('/rates', {
      params: {
        source: sourceAsset,
        destination: destinationAsset,
      },
    });
    return {
      ...response.data,
      timestamp: new Date(response.data.timestamp),
    };
  }

  /**
   * Get supported protocols
   */
  async getSupportedProtocols(): Promise<string[]> {
    const info = await this.getInfo();
    return info.protocols;
  }

  /**
   * Configure routing
   */
  async configureRouting(config: {
    routeBroadcastInterval?: number;
    routeCleanupInterval?: number;
    routeExpiryDuration?: number;
    spreadProportion?: number;
  }): Promise<void> {
    await this.httpClient.patch('/config/routing', config);
  }

  /**
   * Get route cost (for routing decisions)
   */
  async getRouteCost(destination: string, amount: string): Promise<{
    cost: string;
    fee: string;
    route: string[];
    estimatedTime: number;
  }> {
    const response = await this.httpClient.get('/routes/cost', {
      params: {
        destination,
        amount,
      },
    });
    return response.data;
  }

  /**
   * Get connector stats
   */
  async getStats(): Promise<{
    packetsReceived: number;
    packetsSent: number;
    packetsFailed: number;
    bytesReceived: number;
    bytesSent: number;
    amountRouted: string;
    uptime: number;
    startTime: Date;
  }> {
    const response = await this.httpClient.get('/stats');
    return {
      ...response.data,
      startTime: new Date(response.data.startTime),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message?: string;
    }>;
  }> {
    try {
      const response = await this.httpClient.get('/health');
      return response.data;
    } catch {
      return {
        healthy: false,
        checks: [{
          name: 'connectivity',
          status: 'fail',
          message: 'Unable to reach connector',
        }],
      };
    }
  }
}

export default ConnectorClient;
