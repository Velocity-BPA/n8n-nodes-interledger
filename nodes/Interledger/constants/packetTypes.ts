/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * ILP Packet Type Constants
 *
 * ILP uses three packet types for payment processing:
 *
 * 1. PREPARE - Sent to initiate a payment
 *    Contains: destination, amount, expiry, condition, data
 *
 * 2. FULFILL - Sent when payment succeeds
 *    Contains: fulfillment (preimage that satisfies condition), data
 *
 * 3. REJECT - Sent when payment fails
 *    Contains: error code, message, triggered_by address, data
 *
 * The condition/fulfillment mechanism ensures atomic payments:
 * - Sender creates condition (hash of fulfillment)
 * - Receiver reveals fulfillment only after receiving funds
 * - Intermediate connectors hold funds until fulfillment or expiry
 */

/**
 * ILP Packet Type IDs
 */
export const ILP_PACKET_TYPES = {
  /** Prepare packet - initiates payment */
  PREPARE: 12,
  /** Fulfill packet - confirms payment success */
  FULFILL: 13,
  /** Reject packet - indicates payment failure */
  REJECT: 14,
} as const;

/**
 * ILP Packet Type Names
 */
export const ILP_PACKET_TYPE_NAMES: Record<number, string> = {
  [ILP_PACKET_TYPES.PREPARE]: 'IlpPrepare',
  [ILP_PACKET_TYPES.FULFILL]: 'IlpFulfill',
  [ILP_PACKET_TYPES.REJECT]: 'IlpReject',
};

/**
 * Get packet type name
 */
export function getPacketTypeName(typeId: number): string {
  return ILP_PACKET_TYPE_NAMES[typeId] ?? 'Unknown';
}

/**
 * STREAM Packet Frame Types
 * STREAM is a multiplexed transport layer on top of ILP
 */
export const STREAM_FRAME_TYPES = {
  /** Open a new connection */
  CONNECTION_CLOSE: 0x01,
  /** Open a new stream */
  CONNECTION_NEW_ADDRESS: 0x02,
  /** Send data on a stream */
  CONNECTION_DATA_MAX: 0x03,
  /** Close a stream */
  CONNECTION_DATA_BLOCKED: 0x04,
  /** Acknowledge data */
  CONNECTION_MAX_STREAM_ID: 0x05,
  /** Request more streams */
  CONNECTION_STREAM_ID_BLOCKED: 0x06,
  /** Asset details */
  CONNECTION_ASSET_DETAILS: 0x07,
  /** Stream close frame */
  STREAM_CLOSE: 0x10,
  /** Stream money frame */
  STREAM_MONEY: 0x11,
  /** Stream money max frame */
  STREAM_MONEY_MAX: 0x12,
  /** Stream money blocked frame */
  STREAM_MONEY_BLOCKED: 0x13,
  /** Stream data frame */
  STREAM_DATA: 0x14,
  /** Stream data max frame */
  STREAM_DATA_MAX: 0x15,
  /** Stream data blocked frame */
  STREAM_DATA_BLOCKED: 0x16,
  /** Stream receipt frame */
  STREAM_RECEIPT: 0x17,
} as const;

/**
 * ILP Condition size in bytes
 */
export const ILP_CONDITION_SIZE = 32;

/**
 * ILP Fulfillment size in bytes
 */
export const ILP_FULFILLMENT_SIZE = 32;

/**
 * ILP Prepare packet structure
 */
export interface IlpPrepare {
  type: typeof ILP_PACKET_TYPES.PREPARE;
  amount: string;
  expiresAt: Date;
  destination: string;
  executionCondition: Buffer;
  data: Buffer;
}

/**
 * ILP Fulfill packet structure
 */
export interface IlpFulfill {
  type: typeof ILP_PACKET_TYPES.FULFILL;
  fulfillment: Buffer;
  data: Buffer;
}

/**
 * ILP Reject packet structure
 */
export interface IlpReject {
  type: typeof ILP_PACKET_TYPES.REJECT;
  code: string;
  message: string;
  triggeredBy: string;
  data: Buffer;
}

/**
 * Union type for all ILP packets
 */
export type IlpPacket = IlpPrepare | IlpFulfill | IlpReject;

/**
 * Check if packet is Prepare
 */
export function isPrepare(packet: IlpPacket): packet is IlpPrepare {
  return packet.type === ILP_PACKET_TYPES.PREPARE;
}

/**
 * Check if packet is Fulfill
 */
export function isFulfill(packet: IlpPacket): packet is IlpFulfill {
  return packet.type === ILP_PACKET_TYPES.FULFILL;
}

/**
 * Check if packet is Reject
 */
export function isReject(packet: IlpPacket): packet is IlpReject {
  return packet.type === ILP_PACKET_TYPES.REJECT;
}

/**
 * Default expiry timeout in milliseconds
 */
export const DEFAULT_EXPIRY_TIMEOUT_MS = 30000;

/**
 * Maximum ILP packet data size
 */
export const MAX_ILP_PACKET_DATA_SIZE = 32767;

/**
 * ILP packet version
 */
export const ILP_PACKET_VERSION = 0;

/**
 * Create a condition from a fulfillment (SHA-256 hash)
 */
export function createConditionFromFulfillment(fulfillment: Buffer): Buffer {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(fulfillment).digest();
}

/**
 * Verify that a fulfillment matches a condition
 */
export function verifyFulfillment(condition: Buffer, fulfillment: Buffer): boolean {
  const computedCondition = createConditionFromFulfillment(fulfillment);
  return condition.equals(computedCondition);
}

/**
 * Generate a random fulfillment
 */
export function generateFulfillment(): Buffer {
  const crypto = require('crypto');
  return crypto.randomBytes(ILP_FULFILLMENT_SIZE);
}

/**
 * Generate a condition and fulfillment pair
 */
export function generateConditionFulfillmentPair(): { condition: Buffer; fulfillment: Buffer } {
  const fulfillment = generateFulfillment();
  const condition = createConditionFromFulfillment(fulfillment);
  return { condition, fulfillment };
}
