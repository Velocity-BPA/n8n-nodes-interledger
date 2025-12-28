/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { ConnectorClient } from '../../transport/connectorClient';

/**
 * Account Operations
 *
 * Accounts represent ledger positions with peers on ILP connectors.
 */

export async function createAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const ilpAddress = this.getNodeParameter('ilpAddress', index, '') as string;
  const assetCode = this.getNodeParameter('assetCode', index) as string;
  const assetScale = this.getNodeParameter('assetScale', index) as number;
  const maxPacketAmount = this.getNodeParameter('maxPacketAmount', index, '') as string;

  const account = await client.createAccount({
    ilpAddress: ilpAddress || undefined,
    assetCode,
    assetScale,
    maxPacketAmount: maxPacketAmount || undefined,
  });

  return [{ json: account as unknown as IDataObject }];
}

export async function getAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accountId = this.getNodeParameter('accountId', index) as string;
  const account = await client.getAccount(accountId);

  return [{ json: account as unknown as IDataObject }];
}

export async function updateAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accountId = this.getNodeParameter('accountId', index) as string;
  const maxPacketAmount = this.getNodeParameter('maxPacketAmount', index, '') as string;

  const account = await client.updateAccount(accountId, {
    maxPacketAmount: maxPacketAmount || undefined,
  });

  return [{ json: account as unknown as IDataObject }];
}

export async function deleteAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accountId = this.getNodeParameter('accountId', index) as string;
  await client.deleteAccount(accountId);

  return [{
    json: {
      success: true,
      accountId,
      deleted: true,
    } as IDataObject,
  }];
}

export async function listAccounts(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accounts = await client.getAccounts();
  return [{ json: { accounts } as IDataObject }];
}

export async function getAccountBalance(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accountId = this.getNodeParameter('accountId', index) as string;
  const balance = await client.getAccountBalance(accountId);

  return [{
    json: {
      accountId,
      ...balance,
    } as IDataObject,
  }];
}

export async function getAccountSettings(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const accountId = this.getNodeParameter('accountId', index) as string;
  const account = await client.getAccount(accountId);

  return [{
    json: {
      accountId,
      ilpAddress: account.ilpAddress,
      assetCode: account.assetCode,
      assetScale: account.assetScale,
      maxPacketAmount: account.maxPacketAmount,
      isAdmin: account.isAdmin,
    } as IDataObject,
  }];
}

export async function sendToAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  // This would typically involve creating an outgoing payment
  const accountId = this.getNodeParameter('accountId', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;

  // Placeholder - actual implementation would use STREAM
  return [{
    json: {
      success: true,
      accountId,
      amount,
      message: 'Use STREAM or Open Payments for actual transfers',
    } as IDataObject,
  }];
}

export async function receiveFromAccount(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  // This would typically involve creating an incoming payment
  const accountId = this.getNodeParameter('accountId', index) as string;

  return [{
    json: {
      accountId,
      message: 'Use STREAM or Open Payments for receiving payments',
    } as IDataObject,
  }];
}

export const accountOperations = {
  create: createAccount,
  get: getAccount,
  update: updateAccount,
  delete: deleteAccount,
  list: listAccounts,
  getBalance: getAccountBalance,
  getSettings: getAccountSettings,
  sendTo: sendToAccount,
  receiveFrom: receiveFromAccount,
};
