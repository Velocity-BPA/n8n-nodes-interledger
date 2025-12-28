/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';

/**
 * Outgoing Payment Operations
 *
 * Outgoing payments are created to send money from a wallet address.
 * They require a quote and represent the actual payment execution.
 */

export async function createOutgoingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const quoteId = this.getNodeParameter('quoteId', index) as string;
  const metadata = this.getNodeParameter('metadata', index, {}) as IDataObject;

  const result = await client.createOutgoingPayment({
    walletAddress: walletAddressUrl,
    quoteId,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getOutgoingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;
  const result = await client.getOutgoingPayment(outgoingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function listOutgoingPayments(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const first = this.getNodeParameter('first', index, 20) as number;
  const cursor = this.getNodeParameter('cursor', index, '') as string;

  const result = await client.listOutgoingPayments(walletAddressUrl, {
    first,
    cursor: cursor || undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getOutgoingPaymentByUrl(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;
  const result = await client.getOutgoingPayment(outgoingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getSentAmount(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;
  const payment = await client.getOutgoingPayment(outgoingPaymentUrl);

  return [{
    json: {
      outgoingPaymentUrl,
      sentAmount: payment.sentAmount,
      debitAmount: payment.debitAmount,
    } as IDataObject,
  }];
}

export async function getFailedAmount(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;
  const payment = await client.getOutgoingPayment(outgoingPaymentUrl);

  // Failed amount is the difference between debit and sent
  const debitValue = BigInt(payment.debitAmount?.value ?? '0');
  const sentValue = BigInt(payment.sentAmount?.value ?? '0');
  const failedValue = debitValue - sentValue;

  return [{
    json: {
      outgoingPaymentUrl,
      failedAmount: {
        value: failedValue.toString(),
        assetCode: payment.debitAmount?.assetCode ?? '',
        assetScale: payment.debitAmount?.assetScale ?? 0,
      },
      failed: payment.failed,
    } as IDataObject,
  }];
}

export async function cancelOutgoingPayment(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;

  const result = await client.cancelOutgoingPayment(outgoingPaymentUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getPaymentQuote(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const outgoingPaymentUrl = this.getNodeParameter('outgoingPaymentUrl', index) as string;
  const payment = await client.getOutgoingPayment(outgoingPaymentUrl);

  return [{
    json: {
      outgoingPaymentUrl,
      quoteId: payment.quoteId,
      debitAmount: payment.debitAmount,
      receiveAmount: payment.receiveAmount,
    } as IDataObject,
  }];
}

export const outgoingPaymentOperations = {
  create: createOutgoingPayment,
  get: getOutgoingPayment,
  list: listOutgoingPayments,
  getByUrl: getOutgoingPaymentByUrl,
  getSentAmount,
  getFailedAmount,
  cancel: cancelOutgoingPayment,
  getQuote: getPaymentQuote,
};
