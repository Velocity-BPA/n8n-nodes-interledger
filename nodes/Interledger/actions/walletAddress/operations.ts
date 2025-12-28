/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';

/**
 * Wallet Address Operations
 *
 * Wallet addresses are the primary account type in Open Payments.
 * They represent a payment account that can send and receive payments.
 */

export async function getWalletAddress(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressId = this.getNodeParameter('walletAddressId', index) as string;
  const result = await client.getWalletAddress(walletAddressId);

  return [{ json: result as unknown as IDataObject }];
}

export async function getWalletAddressKeys(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const result = await client.getWalletAddressKeys(walletAddressUrl);

  return [{ json: { keys: result } as IDataObject }];
}

export async function createWalletAddress(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const url = this.getNodeParameter('url', index) as string;
  const publicName = this.getNodeParameter('publicName', index, '') as string;
  const assetId = this.getNodeParameter('assetId', index) as string;

  const result = await client.createWalletAddress({
    url,
    publicName: publicName || undefined,
    assetId,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function updateWalletAddress(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressId = this.getNodeParameter('walletAddressId', index) as string;
  const publicName = this.getNodeParameter('publicName', index, '') as string;
  const status = this.getNodeParameter('status', index, '') as string;

  const result = await client.updateWalletAddress({
    id: walletAddressId,
    publicName: publicName || undefined,
    status: status as 'ACTIVE' | 'INACTIVE' | undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getWalletAddressByUrl(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const url = this.getNodeParameter('walletAddressUrl', index) as string;
  const result = await client.getWalletAddressByUrl(url);

  return [{ json: result as unknown as IDataObject }];
}

export async function resolvePaymentPointer(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const result = await client.resolvePaymentPointer(paymentPointer);

  return [{ json: result as unknown as IDataObject }];
}

export async function getSupportedAssets(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;

  // Get wallet address to find asset info
  const walletAddress = await client.getWalletAddressByUrl(walletAddressUrl);

  return [{
    json: {
      assets: [{
        code: walletAddress.assetCode,
        scale: walletAddress.assetScale,
      }],
    } as IDataObject,
  }];
}

export async function getWalletBalance(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;

  // Balance is typically tracked via incoming/outgoing payments
  // This is a simplified implementation
  const walletAddress = await client.getWalletAddressByUrl(walletAddressUrl);

  return [{
    json: {
      walletAddress: walletAddress.id,
      assetCode: walletAddress.assetCode,
      assetScale: walletAddress.assetScale,
      balance: '0', // Would need to sum payment history
    } as IDataObject,
  }];
}

export const walletAddressOperations = {
  get: getWalletAddress,
  getKeys: getWalletAddressKeys,
  create: createWalletAddress,
  update: updateWalletAddress,
  getByUrl: getWalletAddressByUrl,
  resolvePointer: resolvePaymentPointer,
  getSupportedAssets,
  getBalance: getWalletBalance,
};

/**
 * Execute wallet address operation
 */
export async function execute(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  operation: string,
  index: number,
): Promise<INodeExecutionData[]> {
  switch (operation) {
    case 'get':
      return getWalletAddress.call(this, client, index);
    case 'getKeys':
      return getWalletAddressKeys.call(this, client, index);
    case 'create':
      return createWalletAddress.call(this, client, index);
    case 'update':
      return updateWalletAddress.call(this, client, index);
    case 'getByUrl':
      return getWalletAddressByUrl.call(this, client, index);
    case 'resolvePointer':
      return resolvePaymentPointer.call(this, client, index);
    case 'getSupportedAssets':
      return getSupportedAssets.call(this, client, index);
    case 'getBalance':
      return getWalletBalance.call(this, client, index);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
