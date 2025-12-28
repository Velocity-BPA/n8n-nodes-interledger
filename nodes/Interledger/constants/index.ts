/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Interledger Constants
 *
 * This module exports all constants used throughout the Interledger node:
 * - ILP addresses and payment pointers
 * - Assets and currency codes
 * - Packet types and structures
 * - Error codes and messages
 * - Grant types and access configurations
 */

export * from './addresses';
export * from './assets';
export * from './packetTypes';
export * from './errorCodes';
export * from './grantTypes';

/**
 * Protocol Versions
 */
export const PROTOCOL_VERSIONS = {
  /** ILP packet version */
  ILP: 0,
  /** STREAM protocol version */
  STREAM: 1,
  /** Open Payments version */
  OPEN_PAYMENTS: '1.0',
  /** SPSP version */
  SPSP: 4,
} as const;

/**
 * Content Types
 */
export const CONTENT_TYPES = {
  /** SPSP content type */
  SPSP: 'application/spsp4+json',
  /** Open Payments content type */
  OPEN_PAYMENTS: 'application/json',
  /** ILP packet content type */
  ILP_PACKET: 'application/octet-stream',
} as const;

/**
 * HTTP Headers
 */
export const HTTP_HEADERS = {
  /** Content type header */
  CONTENT_TYPE: 'Content-Type',
  /** Accept header */
  ACCEPT: 'Accept',
  /** Authorization header */
  AUTHORIZATION: 'Authorization',
  /** Signature header for HTTP signatures */
  SIGNATURE: 'Signature',
  /** Signature input header */
  SIGNATURE_INPUT: 'Signature-Input',
  /** Content digest header */
  CONTENT_DIGEST: 'Content-Digest',
} as const;

/**
 * Interledger well-known paths
 */
export const WELL_KNOWN_PATHS = {
  /** SPSP/Payment pointer path */
  PAY: '/.well-known/pay',
  /** Open Payments wallet address */
  WALLET: '/',
  /** JWKS for key discovery */
  JWKS: '/.well-known/jwks.json',
} as const;

/**
 * Default timeouts in milliseconds
 */
export const DEFAULT_TIMEOUTS = {
  /** HTTP request timeout */
  HTTP: 30000,
  /** STREAM connection timeout */
  STREAM: 60000,
  /** ILP packet expiry */
  PACKET: 30000,
  /** Grant polling interval */
  GRANT_POLL: 5000,
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  /** Maximum retry attempts */
  MAX_ATTEMPTS: 3,
  /** Initial retry delay in ms */
  INITIAL_DELAY: 1000,
  /** Retry backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
  /** Maximum retry delay in ms */
  MAX_DELAY: 30000,
} as const;

/**
 * Payment States
 */
export const PAYMENT_STATES = {
  /** Payment is pending */
  PENDING: 'pending',
  /** Payment is processing */
  PROCESSING: 'processing',
  /** Payment completed successfully */
  COMPLETED: 'completed',
  /** Payment failed */
  FAILED: 'failed',
  /** Payment was cancelled */
  CANCELLED: 'cancelled',
  /** Payment expired */
  EXPIRED: 'expired',
} as const;

/**
 * Incoming Payment States (Open Payments)
 */
export const INCOMING_PAYMENT_STATES = {
  /** Pending - waiting for funds */
  PENDING: 'pending',
  /** Processing - receiving funds */
  PROCESSING: 'processing',
  /** Completed - all funds received */
  COMPLETED: 'completed',
  /** Expired - payment window closed */
  EXPIRED: 'expired',
} as const;

/**
 * Outgoing Payment States (Open Payments)
 */
export const OUTGOING_PAYMENT_STATES = {
  /** Funding - waiting for funds */
  FUNDING: 'funding',
  /** Sending - payment in progress */
  SENDING: 'sending',
  /** Completed - payment successful */
  COMPLETED: 'completed',
  /** Failed - payment failed */
  FAILED: 'failed',
  /** Cancelled - payment cancelled */
  CANCELLED: 'cancelled',
} as const;

/**
 * Quote States (Open Payments)
 */
export const QUOTE_STATES = {
  /** Active - quote is valid */
  ACTIVE: 'active',
  /** Expired - quote has expired */
  EXPIRED: 'expired',
  /** Used - quote was used for payment */
  USED: 'used',
} as const;

/**
 * Peer States
 */
export const PEER_STATES = {
  /** Connected and active */
  CONNECTED: 'connected',
  /** Disconnected */
  DISCONNECTED: 'disconnected',
  /** Connection pending */
  CONNECTING: 'connecting',
  /** Error state */
  ERROR: 'error',
} as const;

/**
 * Liquidity Event Types
 */
export const LIQUIDITY_EVENTS = {
  /** Liquidity added */
  DEPOSIT: 'deposit',
  /** Liquidity removed */
  WITHDRAWAL: 'withdrawal',
  /** Payment sent (reduces liquidity) */
  PAYMENT_SENT: 'payment_sent',
  /** Payment received (increases liquidity) */
  PAYMENT_RECEIVED: 'payment_received',
} as const;

/**
 * Webhook Event Types
 */
export const WEBHOOK_EVENTS = {
  /** Incoming payment created */
  INCOMING_PAYMENT_CREATED: 'incoming_payment.created',
  /** Incoming payment completed */
  INCOMING_PAYMENT_COMPLETED: 'incoming_payment.completed',
  /** Incoming payment expired */
  INCOMING_PAYMENT_EXPIRED: 'incoming_payment.expired',
  /** Outgoing payment created */
  OUTGOING_PAYMENT_CREATED: 'outgoing_payment.created',
  /** Outgoing payment completed */
  OUTGOING_PAYMENT_COMPLETED: 'outgoing_payment.completed',
  /** Outgoing payment failed */
  OUTGOING_PAYMENT_FAILED: 'outgoing_payment.failed',
  /** Wallet address not found */
  WALLET_ADDRESS_NOT_FOUND: 'wallet_address.not_found',
  /** Asset liquidity low */
  ASSET_LIQUIDITY_LOW: 'asset.liquidity_low',
  /** Peer liquidity low */
  PEER_LIQUIDITY_LOW: 'peer.liquidity_low',
} as const;
