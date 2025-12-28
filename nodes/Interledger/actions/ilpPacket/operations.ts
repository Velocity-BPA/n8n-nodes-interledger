/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import {
  createPreparePacket,
  createFulfillPacket,
  createRejectPacket,
  serializePacket,
  deserializePacket,
  validatePrepare,
  packetToJson,
  generateConditionAndFulfillment,
  parsePacketType,
} from '../../utils/packetUtils';
import { ILP_PACKET_TYPES } from '../../constants/packetTypes';

/**
 * ILP Packet Operations
 *
 * ILP packets are the fundamental unit of value transfer in Interledger.
 * There are three types: Prepare, Fulfill, and Reject.
 */

export async function createPrepare(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const amount = this.getNodeParameter('amount', index) as string;
  const destination = this.getNodeParameter('destination', index) as string;
  const expirySeconds = this.getNodeParameter('expirySeconds', index, 30) as number;
  const data = this.getNodeParameter('data', index, '') as string;
  const generateCondition = this.getNodeParameter('generateCondition', index, true) as boolean;

  let executionCondition: Buffer | undefined;
  let fulfillment: Buffer | undefined;

  if (generateCondition) {
    const pair = generateConditionAndFulfillment();
    executionCondition = pair.condition;
    fulfillment = pair.fulfillment;
  }

  const packet = createPreparePacket({
    amount,
    destination,
    expiresAt: new Date(Date.now() + expirySeconds * 1000),
    executionCondition,
    data: data ? Buffer.from(data, 'utf8') : undefined,
  });

  const serialized = serializePacket(packet);

  return [{
    json: {
      ...packetToJson(packet),
      serialized: serialized.toString('base64'),
      fulfillment: fulfillment?.toString('base64'),
    } as IDataObject,
  }];
}

export async function createFulfill(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const fulfillmentBase64 = this.getNodeParameter('fulfillment', index) as string;
  const data = this.getNodeParameter('data', index, '') as string;

  const fulfillment = Buffer.from(fulfillmentBase64, 'base64');

  const packet = createFulfillPacket({
    fulfillment,
    data: data ? Buffer.from(data, 'utf8') : undefined,
  });

  const serialized = serializePacket(packet);

  return [{
    json: {
      ...packetToJson(packet),
      serialized: serialized.toString('base64'),
    } as IDataObject,
  }];
}

export async function createReject(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const code = this.getNodeParameter('errorCode', index) as string;
  const message = this.getNodeParameter('errorMessage', index) as string;
  const triggeredBy = this.getNodeParameter('triggeredBy', index, '') as string;
  const data = this.getNodeParameter('data', index, '') as string;

  const packet = createRejectPacket({
    code,
    message,
    triggeredBy: triggeredBy || undefined,
    data: data ? Buffer.from(data, 'utf8') : undefined,
  });

  const serialized = serializePacket(packet);

  return [{
    json: {
      ...packetToJson(packet),
      serialized: serialized.toString('base64'),
    } as IDataObject,
  }];
}

export async function parsePacket(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetBase64 = this.getNodeParameter('packet', index) as string;
  const packetBuffer = Buffer.from(packetBase64, 'base64');

  const packet = deserializePacket(packetBuffer);

  return [{ json: packetToJson(packet) as IDataObject }];
}

export async function validatePacket(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetBase64 = this.getNodeParameter('packet', index) as string;
  const packetBuffer = Buffer.from(packetBase64, 'base64');

  const packet = deserializePacket(packetBuffer);

  if (packet.type === ILP_PACKET_TYPES.PREPARE) {
    const validation = validatePrepare(packet);
    return [{
      json: {
        type: 'PREPARE',
        valid: validation.valid,
        errors: validation.errors,
      } as IDataObject,
    }];
  }

  // Fulfill and Reject packets are valid if they parse successfully
  return [{
    json: {
      type: packet.type === ILP_PACKET_TYPES.FULFILL ? 'FULFILL' : 'REJECT',
      valid: true,
      errors: [],
    } as IDataObject,
  }];
}

export async function getPacketType(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetBase64 = this.getNodeParameter('packet', index) as string;
  const packetBuffer = Buffer.from(packetBase64, 'base64');

  const typeCode = parsePacketType(packetBuffer);

  let typeName: string;
  switch (typeCode) {
    case ILP_PACKET_TYPES.PREPARE:
      typeName = 'PREPARE';
      break;
    case ILP_PACKET_TYPES.FULFILL:
      typeName = 'FULFILL';
      break;
    case ILP_PACKET_TYPES.REJECT:
      typeName = 'REJECT';
      break;
    default:
      typeName = 'UNKNOWN';
  }

  return [{
    json: {
      typeCode,
      typeName,
    } as IDataObject,
  }];
}

export async function getPacketData(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetBase64 = this.getNodeParameter('packet', index) as string;
  const packetBuffer = Buffer.from(packetBase64, 'base64');

  const packet = deserializePacket(packetBuffer);

  return [{
    json: {
      ...packetToJson(packet),
    } as IDataObject,
  }];
}

export async function serializePacketOp(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetType = this.getNodeParameter('packetType', index) as string;

  if (packetType === 'PREPARE') {
    const amount = this.getNodeParameter('amount', index) as string;
    const destination = this.getNodeParameter('destination', index) as string;
    const condition = this.getNodeParameter('condition', index) as string;
    const expirySeconds = this.getNodeParameter('expirySeconds', index, 30) as number;

    const packet = createPreparePacket({
      amount,
      destination,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
      executionCondition: Buffer.from(condition, 'base64'),
    });

    return [{
      json: {
        serialized: serializePacket(packet).toString('base64'),
      } as IDataObject,
    }];
  }

  if (packetType === 'FULFILL') {
    const fulfillment = this.getNodeParameter('fulfillment', index) as string;

    const packet = createFulfillPacket({
      fulfillment: Buffer.from(fulfillment, 'base64'),
    });

    return [{
      json: {
        serialized: serializePacket(packet).toString('base64'),
      } as IDataObject,
    }];
  }

  // REJECT
  const code = this.getNodeParameter('errorCode', index) as string;
  const message = this.getNodeParameter('errorMessage', index) as string;

  const packet = createRejectPacket({
    code,
    message,
  });

  return [{
    json: {
      serialized: serializePacket(packet).toString('base64'),
    } as IDataObject,
  }];
}

export async function deserializePacketOp(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const packetBase64 = this.getNodeParameter('packet', index) as string;
  const packetBuffer = Buffer.from(packetBase64, 'base64');

  const packet = deserializePacket(packetBuffer);

  return [{ json: packetToJson(packet) as IDataObject }];
}

export const ilpPacketOperations = {
  createPrepare,
  createFulfill,
  createReject,
  parse: parsePacket,
  validate: validatePacket,
  getType: getPacketType,
  getData: getPacketData,
  serialize: serializePacketOp,
  deserialize: deserializePacketOp,
};
