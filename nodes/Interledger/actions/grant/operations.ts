/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';
import {
  ACCESS_TYPES,
  ACCESS_ACTIONS,
  GRANT_PRESETS,
  isGrantActive,
  requiresInteraction,
} from '../../constants/grantTypes';

/**
 * Grant Operations
 *
 * Grants are authorization tokens that allow access to Open Payments resources.
 * They use GNAP (Grant Negotiation and Authorization Protocol) for auth flows.
 */

export async function requestGrant(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
  const accessType = this.getNodeParameter('accessType', index) as string;
  const accessActions = this.getNodeParameter('accessActions', index) as string[];
  const limits = this.getNodeParameter('limits', index, {}) as IDataObject;

  const result = await client.requestGrant({
    walletAddress: walletAddressUrl,
    access: [{
      type: accessType,
      actions: accessActions,
      limits: Object.keys(limits).length > 0 ? limits : undefined,
    }],
  });

  return [{
    json: {
      ...result as unknown as IDataObject,
      requiresInteraction: requiresInteraction(result),
    },
  }];
}

export async function getGrant(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const continueUri = this.getNodeParameter('continueUri', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;

  const result = await client.getGrantContinuation(continueUri, accessToken);

  return [{ json: result as unknown as IDataObject }];
}

export async function continueGrant(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const continueUri = this.getNodeParameter('continueUri', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;
  const interactRef = this.getNodeParameter('interactRef', index, '') as string;

  const result = await client.continueGrant({
    continueUri,
    accessToken,
    interactRef: interactRef || undefined,
  });

  return [{ json: result as unknown as IDataObject }];
}

export async function cancelGrant(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const continueUri = this.getNodeParameter('continueUri', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;

  await client.cancelGrant(continueUri, accessToken);

  return [{
    json: {
      success: true,
      cancelled: true,
      continueUri,
    } as IDataObject,
  }];
}

export async function revokeGrant(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenManagementUrl = this.getNodeParameter('tokenManagementUrl', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;

  await client.revokeToken(tokenManagementUrl, accessToken);

  return [{
    json: {
      success: true,
      revoked: true,
      tokenManagementUrl,
    } as IDataObject,
  }];
}

export async function getGrantStatus(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const continueUri = this.getNodeParameter('continueUri', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;

  const grant = await client.getGrantContinuation(continueUri, accessToken);

  return [{
    json: {
      continueUri,
      active: isGrantActive(grant),
      access: grant.access,
      accessToken: grant.access_token,
    } as IDataObject,
  }];
}

export async function listGrants(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  // Note: Open Payments doesn't have a native list grants endpoint
  // This would typically be handled by the authorization server
  const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;

  return [{
    json: {
      walletAddressUrl,
      message: 'Grant listing requires authorization server access',
      availablePresets: Object.keys(GRANT_PRESETS),
    } as IDataObject,
  }];
}

export async function getGrantAccessToken(
  this: IExecuteFunctions,
  client: OpenPaymentsClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const continueUri = this.getNodeParameter('continueUri', index) as string;
  const accessToken = this.getNodeParameter('accessToken', index) as string;

  const grant = await client.getGrantContinuation(continueUri, accessToken);

  return [{
    json: {
      accessToken: grant.access_token?.value,
      manageUrl: grant.access_token?.manage,
      expiresIn: grant.access_token?.expires_in,
      access: grant.access_token?.access,
    } as IDataObject,
  }];
}

export const grantOperations = {
  request: requestGrant,
  get: getGrant,
  continue: continueGrant,
  cancel: cancelGrant,
  revoke: revokeGrant,
  getStatus: getGrantStatus,
  list: listGrants,
  getAccessToken: getGrantAccessToken,
};
