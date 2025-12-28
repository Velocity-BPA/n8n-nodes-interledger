/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { ConnectorClient } from '../../transport/connectorClient';

/**
 * Connector Operations
 *
 * ILP Connectors route payments between different ledgers in the Interledger network.
 */

export async function getConnectorInfo(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const info = await client.getInfo();
  return [{ json: info as unknown as IDataObject }];
}

export async function getRoutes(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const routes = await client.getRoutes();
  return [{ json: { routes } as IDataObject }];
}

export async function getPeers(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peers = await client.getPeers();
  return [{ json: { peers } as IDataObject }];
}

export async function addPeer(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const ilpAddress = this.getNodeParameter('ilpAddress', index) as string;
  const relation = this.getNodeParameter('relation', index) as 'peer' | 'parent' | 'child';
  const assetCode = this.getNodeParameter('assetCode', index) as string;
  const assetScale = this.getNodeParameter('assetScale', index) as number;
  const endpoint = this.getNodeParameter('endpoint', index, '') as string;
  const maxPacketAmount = this.getNodeParameter('maxPacketAmount', index, '') as string;

  const peer = await client.addPeer({
    ilpAddress,
    relation,
    assetCode,
    assetScale,
    endpoint: endpoint || undefined,
    maxPacketAmount: maxPacketAmount || undefined,
  });

  return [{ json: peer as unknown as IDataObject }];
}

export async function removePeer(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  await client.removePeer(peerId);

  return [{
    json: {
      success: true,
      peerId,
      removed: true,
    } as IDataObject,
  }];
}

export async function getLiquidity(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const liquidity = await client.getLiquidity();
  return [{ json: { liquidity } as IDataObject }];
}

export async function addLiquidity(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const assetCode = this.getNodeParameter('assetCode', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const peerId = this.getNodeParameter('peerId', index, '') as string;

  const result = await client.addLiquidity({
    assetCode,
    amount,
    peerId: peerId || undefined,
  });

  return [{ json: result as IDataObject }];
}

export async function removeLiquidity(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const assetCode = this.getNodeParameter('assetCode', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const peerId = this.getNodeParameter('peerId', index, '') as string;

  const result = await client.removeLiquidity({
    assetCode,
    amount,
    peerId: peerId || undefined,
  });

  return [{ json: result as IDataObject }];
}

export async function getConnectorBalance(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const balance = await client.getBalance();
  return [{ json: balance as unknown as IDataObject }];
}

export async function getRate(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
  const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;

  const rate = await client.getRate(sourceAsset, destinationAsset);

  return [{ json: rate as unknown as IDataObject }];
}

export async function getSupportedProtocols(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const protocols = await client.getSupportedProtocols();
  return [{ json: { protocols } as IDataObject }];
}

export const connectorOperations = {
  getInfo: getConnectorInfo,
  getRoutes,
  getPeers,
  addPeer,
  removePeer,
  getLiquidity,
  addLiquidity,
  removeLiquidity,
  getBalance: getConnectorBalance,
  getRate,
  getSupportedProtocols,
};
