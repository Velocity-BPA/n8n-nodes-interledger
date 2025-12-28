/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { SpspClient } from '../../transport/spspClient';
import {
  validatePaymentPointer,
  parsePaymentPointer,
  paymentPointerToUrl,
  getSpspEndpoint,
  normalizePaymentPointer,
} from '../../utils/paymentPointerUtils';

/**
 * Payment Pointer Operations
 *
 * Payment pointers are human-readable identifiers for payment accounts.
 * They follow the format $host/path (e.g., $wallet.example.com/alice)
 */

export async function resolvePaymentPointer(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const result = await client.resolvePaymentPointer(paymentPointer);

  return [{ json: result as unknown as IDataObject }];
}

export async function getPaymentPointerMetadata(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const metadata = await client.getPaymentPointerMetadata(paymentPointer);

  return [{ json: metadata as unknown as IDataObject }];
}

export async function validatePaymentPointerOp(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;
  const checkReachability = this.getNodeParameter('checkReachability', index, false) as boolean;

  const validation = validatePaymentPointer(paymentPointer);

  if (!checkReachability) {
    const parsed = parsePaymentPointer(paymentPointer);
    return [{
      json: {
        paymentPointer,
        valid: validation.valid,
        error: validation.error,
        host: parsed?.host ?? '',
        path: parsed?.path ?? '',
        normalized: validation.valid ? normalizePaymentPointer(paymentPointer) : null,
        spspUrl: validation.valid ? paymentPointerToUrl(paymentPointer) : null,
      } as IDataObject,
    }];
  }

  const result = await client.validatePaymentPointer(paymentPointer);

  return [{
    json: {
      paymentPointer,
      ...result,
      normalized: result.valid ? normalizePaymentPointer(paymentPointer) : null,
    } as IDataObject,
  }];
}

export async function getSpspEndpointOp(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;

  const validation = validatePaymentPointer(paymentPointer);
  if (!validation.valid) {
    throw new Error(`Invalid payment pointer: ${validation.error}`);
  }

  const spspUrl = paymentPointerToUrl(paymentPointer);
  const parsed = parsePaymentPointer(paymentPointer);

  return [{
    json: {
      paymentPointer,
      spspEndpoint: spspUrl,
      host: parsed?.host ?? '',
      path: parsed?.path ?? '',
    } as IDataObject,
  }];
}

export async function getReceiverInfo(
  this: IExecuteFunctions,
  client: SpspClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const paymentPointer = this.getNodeParameter('paymentPointer', index) as string;

  const details = await client.getDestinationDetails(paymentPointer);
  const metadata = await client.getPaymentPointerMetadata(paymentPointer);

  return [{
    json: {
      paymentPointer,
      destinationAccount: details.destinationAccount,
      spspEndpoint: details.spspEndpoint,
      publicName: metadata.publicName,
      assetCode: metadata.assetCode,
      assetScale: metadata.assetScale,
      authServer: metadata.authServer,
    } as IDataObject,
  }];
}

export const paymentPointerOperations = {
  resolve: resolvePaymentPointer,
  getMetadata: getPaymentPointerMetadata,
  validate: validatePaymentPointerOp,
  getSpspEndpoint: getSpspEndpointOp,
  getReceiverInfo,
};
