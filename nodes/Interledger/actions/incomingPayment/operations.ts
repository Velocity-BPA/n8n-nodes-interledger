/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';

/**
 * Incoming Payment Operations
 *
 * Incoming payments represent expected payments to a wallet address.
 * They can have an optional expected amount and expiration time.
 */

export async function createIncomingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const incomingAmount = this.getNodeParameter('incomingAmount', index, '') as string;
  const expiresInSeconds = this.getNodeParameter('expiresInSeconds', index, 3600) as number;
  const metadata = this.getNodeParameter('metadata', index, {}) as IDataObject;

  const walletAddress = await client.getWalletAddressByUrl(walletAddressUrl);

  const result = await client.createIncomingPayment({
    walletAddress: walletAddressUrl,
    incomingAmount: incomingAmount ? {
      value: incomingAmount,
      assetCode: walletAddress.assetCode,
      assetScale: walletAddress.assetScale,
    } : undefined,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getIncomingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;
  const result = await client.getIncomingPayment(incomingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function listIncomingPayments(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const first = this.getNodeParameter('first', index, 20) as number;
  const cursor = this.getNodeParameter('cursor', index, '') as string;

  const result = await client.listIncomingPayments(walletAddressUrl, {
    first,
    cursor: cursor || undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function completeIncomingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;
  const result = await client.completeIncomingPayment(incomingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getIncomingPaymentByUrl(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;
  const result = await client.getIncomingPayment(incomingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getReceivedAmount(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;
  const payment = await client.getIncomingPayment(incomingPaymentUrl);

  return [{
    json: {
      incomingPaymentUrl,
      receivedAmount: payment.receivedAmount,
      completed: payment.completed,
    } as IDataObject,
  }];
}

export async function getExpiration(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;
  const payment = await client.getIncomingPayment(incomingPaymentUrl);

  const expiresAt = new Date(payment.expiresAt);
  const now = new Date();
  const isExpired = expiresAt < now;
  const remainingMs = isExpired ? 0 : expiresAt.getTime() - now.getTime();

  return [{
    json: {
      incomingPaymentUrl,
      expiresAt: payment.expiresAt,
      isExpired,
      remainingSeconds: Math.floor(remainingMs / 1000),
    } as IDataObject,
  }];
}

export async function cancelIncomingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const incomingPaymentUrl = this.getNodeParameter('incomingPaymentUrl', index) as string;

  // Complete the payment to effectively cancel it
  const result = await client.completeIncomingPayment(incomingPaymentUrl);

  return [{
    json: {
      ...result as unknown as IDataObject,
      cancelled: true,
    },
  }];
}

export const incomingPaymentOperations = {
  create: createIncomingPayment,
  get: getIncomingPayment,
  list: listIncomingPayments,
  complete: completeIncomingPayment,
  getByUrl: getIncomingPaymentByUrl,
  getReceivedAmount,
  getExpiration,
  cancel: cancelIncomingPayment,
};
