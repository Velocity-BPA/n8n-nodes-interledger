/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import axios, { AxiosInstance } from 'axios';

/**
 * Rafiki Client
 *
 * Rafiki is an open-source implementation of the Open Payments standard.
 * This client provides access to the Rafiki Admin GraphQL API for
 * managing assets, peers, wallet addresses, and other resources.
 *
 * Key resources:
 * - Assets: Supported currencies with their scales
 * - Peers: Connected ILP connectors
 * - Wallet Addresses: Open Payments accounts
 * - Liquidity: Available funds for payments
 */

export interface RafikiCredentials {
  adminUrl: string;
  apiKey?: string;
  authMethod?: 'apiKey' | 'bearer' | 'custom';
  backendUrl?: string;
  authServerUrl?: string;
  timeout?: number;
}

export interface RafikiAsset {
  id: string;
  code: string;
  scale: number;
  withdrawalThreshold?: string;
  createdAt: Date;
}

export interface RafikiPeer {
  id: string;
  name?: string;
  ilpAddress: string;
  assetId: string;
  asset?: RafikiAsset;
  http?: {
    incoming?: { authTokens: string[] };
    outgoing: { endpoint: string; authToken: string };
  };
  maxPacketAmount?: string;
  staticIlpAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RafikiWalletAddress {
  id: string;
  url: string;
  publicName?: string;
  assetId: string;
  asset?: RafikiAsset;
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface RafikiIncomingPayment {
  id: string;
  walletAddressId: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'EXPIRED' | 'FAILED';
  incomingAmount?: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receivedAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RafikiOutgoingPayment {
  id: string;
  walletAddressId: string;
  state: 'FUNDING' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  receiver: string;
  debitAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  sentAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount?: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RafikiQuote {
  id: string;
  walletAddressId: string;
  receiver: string;
  debitAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  maxPacketAmount?: string;
  minExchangeRate?: number;
  lowEstimatedExchangeRate?: number;
  highEstimatedExchangeRate?: number;
  expiresAt: Date;
  createdAt: Date;
}

export class RafikiClient {
  private credentials: RafikiCredentials;
  private httpClient: AxiosInstance;

  constructor(credentials: RafikiCredentials) {
    this.credentials = credentials;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.authMethod === 'apiKey' && credentials.apiKey) {
      headers['X-API-Key'] = credentials.apiKey;
    } else if (credentials.authMethod === 'bearer' && credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    }

    this.httpClient = axios.create({
      baseURL: credentials.adminUrl,
      timeout: credentials.timeout ?? 30000,
      headers,
    });
  }

  /**
   * Execute a GraphQL query
   */
  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await this.httpClient.post('/graphql', {
      query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message ?? 'GraphQL error');
    }

    return response.data.data;
  }

  // ========== Asset Operations ==========

  /**
   * Create an asset
   */
  async createAsset(input: {
    code: string;
    scale: number;
    withdrawalThreshold?: string;
  }): Promise<RafikiAsset> {
    const query = `
      mutation CreateAsset($input: CreateAssetInput!) {
        createAsset(input: $input) {
          asset {
            id
            code
            scale
            withdrawalThreshold
            createdAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createAsset: { asset: RafikiAsset } }>(query, { input });
    return {
      ...result.createAsset.asset,
      createdAt: new Date(result.createAsset.asset.createdAt),
    };
  }

  /**
   * Get an asset by ID
   */
  async getAsset(assetId: string): Promise<RafikiAsset | null> {
    const query = `
      query GetAsset($id: String!) {
        asset(id: $id) {
          id
          code
          scale
          withdrawalThreshold
          createdAt
        }
      }
    `;

    const result = await this.graphql<{ asset: RafikiAsset | null }>(query, { id: assetId });
    if (!result.asset) return null;

    return {
      ...result.asset,
      createdAt: new Date(result.asset.createdAt),
    };
  }

  /**
   * List all assets
   */
  async listAssets(first: number = 20): Promise<RafikiAsset[]> {
    const query = `
      query ListAssets($first: Int!) {
        assets(first: $first) {
          edges {
            node {
              id
              code
              scale
              withdrawalThreshold
              createdAt
            }
          }
        }
      }
    `;

    const result = await this.graphql<{ assets: { edges: Array<{ node: RafikiAsset }> } }>(
      query,
      { first },
    );

    return result.assets.edges.map(edge => ({
      ...edge.node,
      createdAt: new Date(edge.node.createdAt),
    }));
  }

  // ========== Peer Operations ==========

  /**
   * Create a peer
   */
  async createPeer(input: {
    name?: string;
    assetId: string;
    staticIlpAddress: string;
    http: {
      incoming?: { authTokens: string[] };
      outgoing: { endpoint: string; authToken: string };
    };
    maxPacketAmount?: string;
  }): Promise<RafikiPeer> {
    const query = `
      mutation CreatePeer($input: CreatePeerInput!) {
        createPeer(input: $input) {
          peer {
            id
            name
            staticIlpAddress
            assetId
            maxPacketAmount
            http {
              outgoing {
                endpoint
              }
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createPeer: { peer: RafikiPeer } }>(query, { input });
    return {
      ...result.createPeer.peer,
      ilpAddress: result.createPeer.peer.staticIlpAddress,
      createdAt: new Date(result.createPeer.peer.createdAt),
      updatedAt: new Date(result.createPeer.peer.updatedAt),
    };
  }

  /**
   * Get a peer by ID
   */
  async getPeer(peerId: string): Promise<RafikiPeer | null> {
    const query = `
      query GetPeer($id: String!) {
        peer(id: $id) {
          id
          name
          staticIlpAddress
          assetId
          maxPacketAmount
          http {
            outgoing {
              endpoint
            }
          }
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.graphql<{ peer: RafikiPeer | null }>(query, { id: peerId });
    if (!result.peer) return null;

    return {
      ...result.peer,
      ilpAddress: result.peer.staticIlpAddress,
      createdAt: new Date(result.peer.createdAt),
      updatedAt: new Date(result.peer.updatedAt),
    };
  }

  /**
   * Update a peer
   */
  async updatePeer(input: {
    id: string;
    name?: string;
    maxPacketAmount?: string;
  }): Promise<RafikiPeer> {
    const query = `
      mutation UpdatePeer($input: UpdatePeerInput!) {
        updatePeer(input: $input) {
          peer {
            id
            name
            staticIlpAddress
            assetId
            maxPacketAmount
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ updatePeer: { peer: RafikiPeer } }>(query, { input });
    return {
      ...result.updatePeer.peer,
      ilpAddress: result.updatePeer.peer.staticIlpAddress,
      createdAt: new Date(result.updatePeer.peer.createdAt),
      updatedAt: new Date(result.updatePeer.peer.updatedAt),
    };
  }

  /**
   * Delete a peer
   */
  async deletePeer(peerId: string): Promise<boolean> {
    const query = `
      mutation DeletePeer($input: DeletePeerInput!) {
        deletePeer(input: $input) {
          success
        }
      }
    `;

    const result = await this.graphql<{ deletePeer: { success: boolean } }>(
      query,
      { input: { id: peerId } },
    );
    return result.deletePeer.success;
  }

  /**
   * List all peers
   */
  async listPeers(first: number = 20): Promise<RafikiPeer[]> {
    const query = `
      query ListPeers($first: Int!) {
        peers(first: $first) {
          edges {
            node {
              id
              name
              staticIlpAddress
              assetId
              maxPacketAmount
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const result = await this.graphql<{ peers: { edges: Array<{ node: RafikiPeer }> } }>(
      query,
      { first },
    );

    return result.peers.edges.map(edge => ({
      ...edge.node,
      ilpAddress: edge.node.staticIlpAddress,
      createdAt: new Date(edge.node.createdAt),
      updatedAt: new Date(edge.node.updatedAt),
    }));
  }

  // ========== Wallet Address Operations ==========

  /**
   * Create a wallet address
   */
  async createWalletAddress(input: {
    url: string;
    assetId: string;
    publicName?: string;
  }): Promise<RafikiWalletAddress> {
    const query = `
      mutation CreateWalletAddress($input: CreateWalletAddressInput!) {
        createWalletAddress(input: $input) {
          walletAddress {
            id
            url
            publicName
            assetId
            status
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createWalletAddress: { walletAddress: RafikiWalletAddress } }>(
      query,
      { input },
    );
    return {
      ...result.createWalletAddress.walletAddress,
      createdAt: new Date(result.createWalletAddress.walletAddress.createdAt),
      updatedAt: new Date(result.createWalletAddress.walletAddress.updatedAt),
    };
  }

  /**
   * Get a wallet address by ID
   */
  async getWalletAddress(walletAddressId: string): Promise<RafikiWalletAddress | null> {
    const query = `
      query GetWalletAddress($id: String!) {
        walletAddress(id: $id) {
          id
          url
          publicName
          assetId
          status
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.graphql<{ walletAddress: RafikiWalletAddress | null }>(
      query,
      { id: walletAddressId },
    );
    if (!result.walletAddress) return null;

    return {
      ...result.walletAddress,
      createdAt: new Date(result.walletAddress.createdAt),
      updatedAt: new Date(result.walletAddress.updatedAt),
    };
  }

  /**
   * Update a wallet address
   */
  async updateWalletAddress(input: {
    id: string;
    publicName?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }): Promise<RafikiWalletAddress> {
    const query = `
      mutation UpdateWalletAddress($input: UpdateWalletAddressInput!) {
        updateWalletAddress(input: $input) {
          walletAddress {
            id
            url
            publicName
            assetId
            status
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ updateWalletAddress: { walletAddress: RafikiWalletAddress } }>(
      query,
      { input },
    );
    return {
      ...result.updateWalletAddress.walletAddress,
      createdAt: new Date(result.updateWalletAddress.walletAddress.createdAt),
      updatedAt: new Date(result.updateWalletAddress.walletAddress.updatedAt),
    };
  }

  /**
   * List wallet addresses
   */
  async listWalletAddresses(first: number = 20): Promise<RafikiWalletAddress[]> {
    const query = `
      query ListWalletAddresses($first: Int!) {
        walletAddresses(first: $first) {
          edges {
            node {
              id
              url
              publicName
              assetId
              status
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const result = await this.graphql<{ walletAddresses: { edges: Array<{ node: RafikiWalletAddress }> } }>(
      query,
      { first },
    );

    return result.walletAddresses.edges.map(edge => ({
      ...edge.node,
      createdAt: new Date(edge.node.createdAt),
      updatedAt: new Date(edge.node.updatedAt),
    }));
  }

  // ========== Liquidity Operations ==========

  /**
   * Add asset liquidity
   */
  async addAssetLiquidity(input: {
    assetId: string;
    amount: string;
    id: string;
  }): Promise<{ success: boolean }> {
    const query = `
      mutation AddAssetLiquidity($input: AddAssetLiquidityInput!) {
        addAssetLiquidity(input: $input) {
          success
        }
      }
    `;

    return this.graphql(query, { input });
  }

  /**
   * Add peer liquidity
   */
  async addPeerLiquidity(input: {
    peerId: string;
    amount: string;
    id: string;
  }): Promise<{ success: boolean }> {
    const query = `
      mutation AddPeerLiquidity($input: AddPeerLiquidityInput!) {
        addPeerLiquidity(input: $input) {
          success
        }
      }
    `;

    return this.graphql(query, { input });
  }

  /**
   * Withdraw asset liquidity
   */
  async withdrawAssetLiquidity(input: {
    assetId: string;
    amount: string;
    id: string;
  }): Promise<{ success: boolean }> {
    const query = `
      mutation WithdrawAssetLiquidity($input: WithdrawAssetLiquidityInput!) {
        withdrawAssetLiquidity(input: $input) {
          success
        }
      }
    `;

    return this.graphql(query, { input });
  }

  // ========== Health & Stats ==========

  /**
   * Get Rafiki health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    version?: string;
  }> {
    try {
      const response = await this.httpClient.get('/health');
      return {
        healthy: response.status === 200,
        version: response.data?.version,
      };
    } catch {
      return { healthy: false };
    }
  }

  /**
   * Get Rafiki stats
   */
  async getStats(): Promise<{
    assetsCount: number;
    peersCount: number;
    walletAddressesCount: number;
    incomingPaymentsCount: number;
    outgoingPaymentsCount: number;
  }> {
    // This would typically be a custom stats endpoint or aggregation query
    const assets = await this.listAssets(1000);
    const peers = await this.listPeers(1000);
    const walletAddresses = await this.listWalletAddresses(1000);

    return {
      assetsCount: assets.length,
      peersCount: peers.length,
      walletAddressesCount: walletAddresses.length,
      incomingPaymentsCount: 0, // Would need separate query
      outgoingPaymentsCount: 0, // Would need separate query
    };
  }

  /**
   * Create a quote
   */
  async createQuote(input: {
    walletAddressId: string;
    receiver: string;
    debitAmount?: { value: string; assetCode: string; assetScale: number };
    receiveAmount?: { value: string; assetCode: string; assetScale: number };
  }): Promise<RafikiQuote> {
    const query = `
      mutation CreateQuote($input: CreateQuoteInput!) {
        createQuote(input: $input) {
          quote {
            id
            walletAddressId
            receiver
            debitAmount {
              value
              assetCode
              assetScale
            }
            receiveAmount {
              value
              assetCode
              assetScale
            }
            maxPacketAmount
            minExchangeRate
            lowEstimatedExchangeRate
            highEstimatedExchangeRate
            expiresAt
            createdAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createQuote: { quote: RafikiQuote } }>(query, { input });
    return {
      ...result.createQuote.quote,
      expiresAt: new Date(result.createQuote.quote.expiresAt),
      createdAt: new Date(result.createQuote.quote.createdAt),
    };
  }

  /**
   * Create an outgoing payment
   */
  async createOutgoingPayment(input: {
    walletAddressId: string;
    quoteId: string;
  }): Promise<RafikiOutgoingPayment> {
    const query = `
      mutation CreateOutgoingPayment($input: CreateOutgoingPaymentInput!) {
        createOutgoingPayment(input: $input) {
          payment {
            id
            walletAddressId
            state
            receiver
            debitAmount {
              value
              assetCode
              assetScale
            }
            sentAmount {
              value
              assetCode
              assetScale
            }
            receiveAmount {
              value
              assetCode
              assetScale
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createOutgoingPayment: { payment: RafikiOutgoingPayment } }>(
      query,
      { input },
    );
    return {
      ...result.createOutgoingPayment.payment,
      createdAt: new Date(result.createOutgoingPayment.payment.createdAt),
      updatedAt: new Date(result.createOutgoingPayment.payment.updatedAt),
    };
  }

  /**
   * Create an incoming payment
   */
  async createIncomingPayment(input: {
    walletAddressId: string;
    incomingAmount?: { value: string; assetCode: string; assetScale: number };
    expiresAt?: Date;
  }): Promise<RafikiIncomingPayment> {
    const query = `
      mutation CreateIncomingPayment($input: CreateIncomingPaymentInput!) {
        createIncomingPayment(input: $input) {
          payment {
            id
            walletAddressId
            state
            incomingAmount {
              value
              assetCode
              assetScale
            }
            receivedAmount {
              value
              assetCode
              assetScale
            }
            expiresAt
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.graphql<{ createIncomingPayment: { payment: RafikiIncomingPayment } }>(
      query,
      {
        input: {
          ...input,
          expiresAt: input.expiresAt?.toISOString(),
        },
      },
    );
    return {
      ...result.createIncomingPayment.payment,
      expiresAt: new Date(result.createIncomingPayment.payment.expiresAt),
      createdAt: new Date(result.createIncomingPayment.payment.createdAt),
      updatedAt: new Date(result.createIncomingPayment.payment.updatedAt),
    };
  }
}

export default RafikiClient;
