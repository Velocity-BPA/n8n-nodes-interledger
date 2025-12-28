/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as crypto from 'crypto';
import {
  ILP_PACKET_TYPES,
  ILP_CONDITION_SIZE,
  ILP_FULFILLMENT_SIZE,
  IlpPrepare,
  IlpFulfill,
  IlpReject,
  IlpPacket,
  DEFAULT_EXPIRY_TIMEOUT_MS,
} from '../constants/packetTypes';

/**
 * ILP Packet Utilities
 *
 * Utilities for creating, parsing, and validating ILP packets.
 * ILP packets are the fundamental unit of value transfer in Interledger.
 *
 * Packet types:
 * - PREPARE (12): Initiates a payment with condition
 * - FULFILL (13): Completes a payment with fulfillment
 * - REJECT (14): Indicates payment failure with error
 */

/**
 * Create an ILP Prepare packet
 */
export function createPreparePacket(options: {
  amount: string | bigint;
  destination: string;
  expiresAt?: Date;
  executionCondition?: Buffer;
  data?: Buffer;
}): IlpPrepare {
  const amount = typeof options.amount === 'bigint'
    ? options.amount.toString()
    : options.amount;

  const expiresAt = options.expiresAt ?? new Date(Date.now() + DEFAULT_EXPIRY_TIMEOUT_MS);
  const executionCondition = options.executionCondition ?? generateCondition();
  const data = options.data ?? Buffer.alloc(0);

  return {
    type: ILP_PACKET_TYPES.PREPARE,
    amount,
    expiresAt,
    destination: options.destination,
    executionCondition,
    data,
  };
}

/**
 * Create an ILP Fulfill packet
 */
export function createFulfillPacket(options: {
  fulfillment: Buffer;
  data?: Buffer;
}): IlpFulfill {
  if (options.fulfillment.length !== ILP_FULFILLMENT_SIZE) {
    throw new Error(`Fulfillment must be ${ILP_FULFILLMENT_SIZE} bytes`);
  }

  return {
    type: ILP_PACKET_TYPES.FULFILL,
    fulfillment: options.fulfillment,
    data: options.data ?? Buffer.alloc(0),
  };
}

/**
 * Create an ILP Reject packet
 */
export function createRejectPacket(options: {
  code: string;
  message: string;
  triggeredBy?: string;
  data?: Buffer;
}): IlpReject {
  return {
    type: ILP_PACKET_TYPES.REJECT,
    code: options.code,
    message: options.message,
    triggeredBy: options.triggeredBy ?? '',
    data: options.data ?? Buffer.alloc(0),
  };
}

/**
 * Generate a random fulfillment
 */
export function generateFulfillment(): Buffer {
  return crypto.randomBytes(ILP_FULFILLMENT_SIZE);
}

/**
 * Generate a condition from a fulfillment (SHA-256 hash)
 */
export function generateConditionFromFulfillment(fulfillment: Buffer): Buffer {
  return crypto.createHash('sha256').update(fulfillment).digest();
}

/**
 * Generate a random condition and its fulfillment
 */
export function generateConditionAndFulfillment(): {
  condition: Buffer;
  fulfillment: Buffer;
} {
  const fulfillment = generateFulfillment();
  const condition = generateConditionFromFulfillment(fulfillment);
  return { condition, fulfillment };
}

/**
 * Generate a random condition (for testing)
 */
export function generateCondition(): Buffer {
  return crypto.randomBytes(ILP_CONDITION_SIZE);
}

/**
 * Verify that a fulfillment matches a condition
 */
export function verifyCondition(condition: Buffer, fulfillment: Buffer): boolean {
  if (condition.length !== ILP_CONDITION_SIZE) {
    return false;
  }
  if (fulfillment.length !== ILP_FULFILLMENT_SIZE) {
    return false;
  }

  const computedCondition = generateConditionFromFulfillment(fulfillment);
  return condition.equals(computedCondition);
}

/**
 * Serialize an ILP Prepare packet
 */
export function serializePrepare(packet: IlpPrepare): Buffer {
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64BE(BigInt(packet.amount));

  const expiryStr = packet.expiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const expiryBuf = Buffer.from(expiryStr, 'ascii');

  const destBuf = Buffer.from(packet.destination, 'ascii');
  const destLenBuf = Buffer.alloc(1);
  destLenBuf.writeUInt8(destBuf.length);

  const dataLenBuf = Buffer.alloc(4);
  dataLenBuf.writeUInt32BE(packet.data.length);

  const typeBuffer = Buffer.alloc(1);
  typeBuffer.writeUInt8(ILP_PACKET_TYPES.PREPARE);

  const expiryLenBuf = Buffer.alloc(1);
  expiryLenBuf.writeUInt8(expiryBuf.length);

  return Buffer.concat([
    typeBuffer,
    amountBuf,
    expiryLenBuf,
    expiryBuf,
    packet.executionCondition,
    destLenBuf,
    destBuf,
    dataLenBuf,
    packet.data,
  ]);
}

/**
 * Serialize an ILP Fulfill packet
 */
export function serializeFulfill(packet: IlpFulfill): Buffer {
  const typeBuffer = Buffer.alloc(1);
  typeBuffer.writeUInt8(ILP_PACKET_TYPES.FULFILL);

  const dataLenBuf = Buffer.alloc(4);
  dataLenBuf.writeUInt32BE(packet.data.length);

  return Buffer.concat([
    typeBuffer,
    packet.fulfillment,
    dataLenBuf,
    packet.data,
  ]);
}

/**
 * Serialize an ILP Reject packet
 */
export function serializeReject(packet: IlpReject): Buffer {
  const typeBuffer = Buffer.alloc(1);
  typeBuffer.writeUInt8(ILP_PACKET_TYPES.REJECT);

  const codeBuf = Buffer.from(packet.code, 'ascii');
  const triggeredByBuf = Buffer.from(packet.triggeredBy, 'ascii');
  const messageBuf = Buffer.from(packet.message, 'utf8');

  const triggeredByLenBuf = Buffer.alloc(1);
  triggeredByLenBuf.writeUInt8(triggeredByBuf.length);

  const messageLenBuf = Buffer.alloc(2);
  messageLenBuf.writeUInt16BE(messageBuf.length);

  const dataLenBuf = Buffer.alloc(4);
  dataLenBuf.writeUInt32BE(packet.data.length);

  return Buffer.concat([
    typeBuffer,
    codeBuf,
    triggeredByLenBuf,
    triggeredByBuf,
    messageLenBuf,
    messageBuf,
    dataLenBuf,
    packet.data,
  ]);
}

/**
 * Serialize any ILP packet
 */
export function serializePacket(packet: IlpPacket): Buffer {
  switch (packet.type) {
    case ILP_PACKET_TYPES.PREPARE:
      return serializePrepare(packet as IlpPrepare);
    case ILP_PACKET_TYPES.FULFILL:
      return serializeFulfill(packet as IlpFulfill);
    case ILP_PACKET_TYPES.REJECT:
      return serializeReject(packet as IlpReject);
    default:
      throw new Error(`Unknown packet type: ${(packet as IlpPacket).type}`);
  }
}

/**
 * Parse packet type from buffer
 */
export function parsePacketType(buffer: Buffer): number {
  if (buffer.length < 1) {
    throw new Error('Buffer too short to parse packet type');
  }
  return buffer.readUInt8(0);
}

/**
 * Deserialize an ILP Prepare packet
 */
export function deserializePrepare(buffer: Buffer): IlpPrepare {
  let offset = 1; // Skip type byte

  const amount = buffer.readBigUInt64BE(offset).toString();
  offset += 8;

  const expiryLen = buffer.readUInt8(offset);
  offset += 1;

  const expiryStr = buffer.subarray(offset, offset + expiryLen).toString('ascii');
  const expiresAt = new Date(expiryStr);
  offset += expiryLen;

  const executionCondition = buffer.subarray(offset, offset + ILP_CONDITION_SIZE);
  offset += ILP_CONDITION_SIZE;

  const destLen = buffer.readUInt8(offset);
  offset += 1;

  const destination = buffer.subarray(offset, offset + destLen).toString('ascii');
  offset += destLen;

  const dataLen = buffer.readUInt32BE(offset);
  offset += 4;

  const data = buffer.subarray(offset, offset + dataLen);

  return {
    type: ILP_PACKET_TYPES.PREPARE,
    amount,
    expiresAt,
    destination,
    executionCondition,
    data,
  };
}

/**
 * Deserialize an ILP Fulfill packet
 */
export function deserializeFulfill(buffer: Buffer): IlpFulfill {
  let offset = 1; // Skip type byte

  const fulfillment = buffer.subarray(offset, offset + ILP_FULFILLMENT_SIZE);
  offset += ILP_FULFILLMENT_SIZE;

  const dataLen = buffer.readUInt32BE(offset);
  offset += 4;

  const data = buffer.subarray(offset, offset + dataLen);

  return {
    type: ILP_PACKET_TYPES.FULFILL,
    fulfillment,
    data,
  };
}

/**
 * Deserialize an ILP Reject packet
 */
export function deserializeReject(buffer: Buffer): IlpReject {
  let offset = 1; // Skip type byte

  const code = buffer.subarray(offset, offset + 3).toString('ascii');
  offset += 3;

  const triggeredByLen = buffer.readUInt8(offset);
  offset += 1;

  const triggeredBy = buffer.subarray(offset, offset + triggeredByLen).toString('ascii');
  offset += triggeredByLen;

  const messageLen = buffer.readUInt16BE(offset);
  offset += 2;

  const message = buffer.subarray(offset, offset + messageLen).toString('utf8');
  offset += messageLen;

  const dataLen = buffer.readUInt32BE(offset);
  offset += 4;

  const data = buffer.subarray(offset, offset + dataLen);

  return {
    type: ILP_PACKET_TYPES.REJECT,
    code,
    message,
    triggeredBy,
    data,
  };
}

/**
 * Deserialize any ILP packet
 */
export function deserializePacket(buffer: Buffer): IlpPacket {
  const type = parsePacketType(buffer);

  switch (type) {
    case ILP_PACKET_TYPES.PREPARE:
      return deserializePrepare(buffer);
    case ILP_PACKET_TYPES.FULFILL:
      return deserializeFulfill(buffer);
    case ILP_PACKET_TYPES.REJECT:
      return deserializeReject(buffer);
    default:
      throw new Error(`Unknown packet type: ${type}`);
  }
}

/**
 * Validate a Prepare packet
 */
export function validatePrepare(packet: IlpPrepare): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate amount
  try {
    const amount = BigInt(packet.amount);
    if (amount < 0) {
      errors.push('Amount must be non-negative');
    }
  } catch {
    errors.push('Invalid amount format');
  }

  // Validate destination
  if (!packet.destination || packet.destination.length === 0) {
    errors.push('Destination is required');
  }

  // Validate condition
  if (packet.executionCondition.length !== ILP_CONDITION_SIZE) {
    errors.push(`Condition must be ${ILP_CONDITION_SIZE} bytes`);
  }

  // Validate expiry
  if (packet.expiresAt < new Date()) {
    errors.push('Packet has already expired');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a packet has expired
 */
export function isExpired(packet: IlpPrepare): boolean {
  return packet.expiresAt < new Date();
}

/**
 * Get remaining time until packet expires
 */
export function getTimeToExpiry(packet: IlpPrepare): number {
  return packet.expiresAt.getTime() - Date.now();
}

/**
 * Convert packet to JSON-serializable object
 */
export function packetToJson(packet: IlpPacket): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: packet.type,
  };

  if (packet.type === ILP_PACKET_TYPES.PREPARE) {
    const p = packet as IlpPrepare;
    return {
      ...base,
      amount: p.amount,
      expiresAt: p.expiresAt.toISOString(),
      destination: p.destination,
      executionCondition: p.executionCondition.toString('base64'),
      data: p.data.toString('base64'),
    };
  }

  if (packet.type === ILP_PACKET_TYPES.FULFILL) {
    const p = packet as IlpFulfill;
    return {
      ...base,
      fulfillment: p.fulfillment.toString('base64'),
      data: p.data.toString('base64'),
    };
  }

  if (packet.type === ILP_PACKET_TYPES.REJECT) {
    const p = packet as IlpReject;
    return {
      ...base,
      code: p.code,
      message: p.message,
      triggeredBy: p.triggeredBy,
      data: p.data.toString('base64'),
    };
  }

  return base;
}
