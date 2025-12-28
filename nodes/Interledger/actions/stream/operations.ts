/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { StreamClient } from '../../transport/streamClient';

/**
 * STREAM Operations
 *
 * STREAM (Scalable Transport for Real-time Exchange of Assets and Messages)
 * is a multiplexed transport protocol for ILP payments.
 */

export async function createConnection(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const destinationAccount = this.getNodeParameter('destinationAccount', index) as string;
  const sharedSecret = this.getNodeParameter('sharedSecret', index) as string;

  const connection = await client.createConnection({
    destinationAccount,
    sharedSecret,
  });

  return [{
    json: {
      connectionId: connection.id,
      destinationAccount: connection.destinationAccount,
      state: connection.state,
      createdAt: connection.createdAt.toISOString(),
    } as IDataObject,
  }];
}

export async function sendPayment(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const sourceAmount = this.getNodeParameter('sourceAmount', index, '') as string;
  const destinationAmount = this.getNodeParameter('destinationAmount', index, '') as string;
  const timeout = this.getNodeParameter('timeout', index, 30000) as number;
  const slippage = this.getNodeParameter('slippage', index, 0.01) as number;

  const result = await client.sendPayment(connectionId, {
    sourceAmount: sourceAmount || undefined,
    destinationAmount: destinationAmount || undefined,
    timeout,
    slippage,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function receivePayment(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;

  const result = await client.receivePayment(connectionId);

  return [{ json: result as IDataObject }];
}

export async function getConnectionId(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const connection = client.getConnection(connectionId);

  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  return [{
    json: {
      connectionId: connection.id,
      destinationAccount: connection.destinationAccount,
    } as IDataObject,
  }];
}

export async function getSharedSecret(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const sharedSecret = client.getSharedSecret(connectionId);

  return [{
    json: {
      connectionId,
      sharedSecret,
    } as IDataObject,
  }];
}

export async function closeConnection(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;

  await client.closeConnection(connectionId);

  return [{
    json: {
      connectionId,
      closed: true,
    } as IDataObject,
  }];
}

export async function getConnectionState(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const state = client.getConnectionState(connectionId);

  return [{
    json: {
      connectionId,
      state,
    } as IDataObject,
  }];
}

export async function getMoneyReceived(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const moneyReceived = client.getMoneyReceived(connectionId);

  return [{
    json: {
      connectionId,
      moneyReceived,
    } as IDataObject,
  }];
}

export async function getMoneySent(
  this: IExecuteFunctions,
  client: StreamClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const connectionId = this.getNodeParameter('connectionId', index) as string;
  const moneySent = client.getMoneySent(connectionId);

  return [{
    json: {
      connectionId,
      moneySent,
    } as IDataObject,
  }];
}

export const streamOperations = {
  createConnection,
  sendPayment,
  receivePayment,
  getConnectionId,
  getSharedSecret,
  closeConnection,
  getState: getConnectionState,
  getMoneyReceived,
  getMoneySent,
};
