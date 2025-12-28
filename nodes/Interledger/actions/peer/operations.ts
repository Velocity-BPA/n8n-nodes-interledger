/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { ConnectorClient } from '../../transport/connectorClient';

/**
 * Peer Operations
 *
 * Peers are connected ILP connectors that can route payments.
 */

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
  const minBalance = this.getNodeParameter('minBalance', index, '') as string;
  const rateLimit = this.getNodeParameter('rateLimit', index, 0) as number;

  const peer = await client.addPeer({
    ilpAddress,
    relation,
    assetCode,
    assetScale,
    endpoint: endpoint || undefined,
    maxPacketAmount: maxPacketAmount || undefined,
    minBalance: minBalance || undefined,
    rateLimit: rateLimit || undefined,
  });

  return [{ json: peer as unknown as IDataObject }];
}

export async function getPeer(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const peer = await client.getPeer(peerId);

  return [{ json: peer as unknown as IDataObject }];
}

export async function updatePeer(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const maxPacketAmount = this.getNodeParameter('maxPacketAmount', index, '') as string;
  const minBalance = this.getNodeParameter('minBalance', index, '') as string;
  const rateLimit = this.getNodeParameter('rateLimit', index, 0) as number;

  const peer = await client.updatePeer(peerId, {
    maxPacketAmount: maxPacketAmount || undefined,
    minBalance: minBalance || undefined,
    rateLimit: rateLimit || undefined,
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

export async function listPeers(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peers = await client.getPeers();
  return [{ json: { peers } as IDataObject }];
}

export async function getPeerStatus(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const status = await client.getPeerStatus(peerId);

  return [{
    json: {
      peerId,
      ...status,
    } as IDataObject,
  }];
}

export async function getPeerBalance(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const balance = await client.getPeerBalance(peerId);

  return [{
    json: {
      peerId,
      ...balance,
    } as IDataObject,
  }];
}

export async function configurePeer(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const maxPacketAmount = this.getNodeParameter('maxPacketAmount', index, '') as string;
  const minBalance = this.getNodeParameter('minBalance', index, '') as string;
  const rateLimit = this.getNodeParameter('rateLimit', index, 0) as number;

  const peer = await client.updatePeer(peerId, {
    maxPacketAmount: maxPacketAmount || undefined,
    minBalance: minBalance || undefined,
    rateLimit: rateLimit || undefined,
  });

  return [{ json: peer as unknown as IDataObject }];
}

export async function testPeerConnection(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const peerId = this.getNodeParameter('peerId', index) as string;
  const result = await client.testPeerConnection(peerId);

  return [{
    json: {
      peerId,
      ...result,
    } as IDataObject,
  }];
}

export const peerOperations = {
  add: addPeer,
  get: getPeer,
  update: updatePeer,
  remove: removePeer,
  list: listPeers,
  getStatus: getPeerStatus,
  getBalance: getPeerBalance,
  configure: configurePeer,
  testConnection: testPeerConnection,
};
