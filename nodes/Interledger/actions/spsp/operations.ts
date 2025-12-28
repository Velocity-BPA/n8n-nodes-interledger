/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { SpspClient } from '../../transport/spspClient';

/**
 * SPSP Operations
 *
 * Simple Payment Setup Protocol (SPSP) is used to exchange payment
 * details before initiating a STREAM payment.
 */

export async function queryEndpoint(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const result = await client.queryEndpoint(paymentPointer);

  return [{ json: result as unknown as IDataObject }];
}

export async function sendPayment(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const assetCode = this.getNodeParameter('assetCode', index, '') as string;
  const assetScale = this.getNodeParameter('assetScale', index, 2) as number;
  const timeout = this.getNodeParameter('timeout', index, 30000) as number;
  const slippage = this.getNodeParameter('slippage', index, 0.01) as number;

  const result = await client.sendPayment(paymentPointer, {
    amount,
    assetCode: assetCode || undefined,
    assetScale,
    timeout,
    slippage,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getSpspResponse(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const response = await client.getSpspResponse(paymentPointer);

  return [{ json: response as unknown as IDataObject }];
}

export async function getDestinationDetails(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const details = await client.getDestinationDetails(paymentPointer);

  return [{ json: details as IDataObject }];
}

export async function getSharedSecret(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const sharedSecret = await client.getSharedSecret(paymentPointer);

  return [{
    json: {
      paymentPointer,
      sharedSecret,
    } as IDataObject,
  }];
}

export async function getDestinationAccount(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const destinationAccount = await client.getDestinationAccount(paymentPointer);

  return [{
    json: {
      paymentPointer,
      destinationAccount,
    } as IDataObject,
  }];
}

export const spspOperations = {
  queryEndpoint,
  sendPayment,
  getResponse: getSpspResponse,
  getDestinationDetails,
  getSharedSecret,
  getDestinationAccount,
};
