/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';

/**
 * Quote Operations
 *
 * Quotes are used to determine the cost of a payment before execution.
 * They include exchange rate information and have an expiration time.
 */

export async function createQuote(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const receiver = this.getNodeParameter('receiver', index) as string;
  const debitAmount = this.getNodeParameter('debitAmount', index, '') as string;
  const receiveAmount = this.getNodeParameter('receiveAmount', index, '') as string;
  const assetCode = this.getNodeParameter('assetCode', index, '') as string;
  const assetScale = this.getNodeParameter('assetScale', index, 2) as number;

  const walletAddress = await client.getWalletAddressByUrl(walletAddressUrl);

  const result = await client.createQuote({
    walletAddress: walletAddressUrl,
    receiver,
    debitAmount: debitAmount ? {
      value: debitAmount,
      assetCode: assetCode || walletAddress.assetCode,
      assetScale: assetScale ?? walletAddress.assetScale,
    } : undefined,
    receiveAmount: receiveAmount ? {
      value: receiveAmount,
      assetCode: assetCode || walletAddress.assetCode,
      assetScale: assetScale ?? walletAddress.assetScale,
    } : undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function getQuote(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const quoteUrl = this.getNodeParameter('quoteUrl', index) as string;
  const result = await client.getQuote(quoteUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getQuoteById(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const quoteId = this.getNodeParameter('quoteId', index) as string;

  // Construct quote URL from wallet address and quote ID
  const baseUrl = new URL(walletAddressUrl);
  const quoteUrl = `${baseUrl.origin}/quotes/${quoteId}`;

  const result = await client.getQuote(quoteUrl);

  return [{ json: result as unknown as IDataObject }];
}

export async function getQuoteExpiration(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const quoteUrl = this.getNodeParameter('quoteUrl', index) as string;
  const quote = await client.getQuote(quoteUrl);

  const expiresAt = new Date(quote.expiresAt);
  const now = new Date();
  const isExpired = expiresAt < now;
  const remainingMs = isExpired ? 0 : expiresAt.getTime() - now.getTime();

  return [{
    json: {
      quoteUrl,
      expiresAt: quote.expiresAt,
      isExpired,
      remainingSeconds: Math.floor(remainingMs / 1000),
    } as IDataObject,
  }];
}

export async function calculateExchangeRate(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const quoteUrl = this.getNodeParameter('quoteUrl', index) as string;
  const quote = await client.getQuote(quoteUrl);

  const debitValue = BigInt(quote.debitAmount?.value ?? '0');
  const receiveValue = BigInt(quote.receiveAmount?.value ?? '0');

  // Calculate effective exchange rate
  let exchangeRate = 0;
  if (debitValue > 0n) {
    exchangeRate = Number(receiveValue) / Number(debitValue);
  }

  return [{
    json: {
      quoteUrl,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      exchangeRate,
      lowEstimatedExchangeRate: quote.lowEstimatedExchangeRate,
      highEstimatedExchangeRate: quote.highEstimatedExchangeRate,
    } as IDataObject,
  }];
}

export async function getFeeEstimate(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const quoteUrl = this.getNodeParameter('quoteUrl', index) as string;
  const quote = await client.getQuote(quoteUrl);

  // Fee is typically the difference between debit and receive amounts
  // when same asset, or calculated based on exchange rates
  const debitValue = BigInt(quote.debitAmount?.value ?? '0');
  const receiveValue = BigInt(quote.receiveAmount?.value ?? '0');

  // If same asset, fee is the difference
  const isSameAsset = quote.debitAmount?.assetCode === quote.receiveAmount?.assetCode;
  let feeValue = 0n;
  let feePercentage = 0;

  if (isSameAsset) {
    feeValue = debitValue - receiveValue;
    feePercentage = debitValue > 0n ? Number(feeValue) / Number(debitValue) * 100 : 0;
  }

  return [{
    json: {
      quoteUrl,
      fee: {
        value: feeValue.toString(),
        assetCode: quote.debitAmount?.assetCode ?? '',
        assetScale: quote.debitAmount?.assetScale ?? 0,
      },
      feePercentage,
      isSameAsset,
    } as IDataObject,
  }];
}

export async function getPathPaymentQuote(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const receiver = this.getNodeParameter('receiver', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const sendMax = this.getNodeParameter('sendMax', index, '') as string;

  const walletAddress = await client.getWalletAddressByUrl(walletAddressUrl);

  // Create a quote with the specified amount
  const quote = await client.createQuote({
    walletAddress: walletAddressUrl,
    receiver,
    receiveAmount: {
      value: amount,
      assetCode: walletAddress.assetCode,
      assetScale: walletAddress.assetScale,
    },
  });

  // Check if quote exceeds sendMax
  const debitValue = BigInt(quote.debitAmount?.value ?? '0');
  const maxValue = sendMax ? BigInt(sendMax) : null;
  const exceedsMax = maxValue !== null && debitValue > maxValue;

  return [{
    json: {
      ...quote as unknown as IDataObject,
      exceedsMaximum: exceedsMax,
      sendMax: sendMax || null,
    },
  }];
}

export const quoteOperations = {
  create: createQuote,
  get: getQuote,
  getById: getQuoteById,
  getExpiration: getQuoteExpiration,
  calculateExchangeRate,
  getFeeEstimate,
  getPathPaymentQuote,
};
