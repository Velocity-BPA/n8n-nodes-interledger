/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * Interledger Credentials
 *
 * Supports multiple Interledger configurations:
 * - Rafiki (Open Payments) - Open-source Open Payments implementation
 * - ILP Connector - Direct connector access
 * - STREAM Protocol - Streaming payments
 * - Custom endpoint - Custom ILP endpoint
 *
 * Uses Ed25519 key pairs for HTTP signatures as per Open Payments spec.
 */
export class Interledger implements ICredentialType {
  name = 'interledger';
  displayName = 'Interledger';
  documentationUrl = 'https://interledger.org/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'Configuration Type',
      name: 'configurationType',
      type: 'options',
      options: [
        {
          name: 'Rafiki (Open Payments)',
          value: 'rafiki',
          description: 'Open-source Open Payments implementation',
        },
        {
          name: 'ILP Connector',
          value: 'connector',
          description: 'Direct ILP connector access',
        },
        {
          name: 'STREAM Protocol',
          value: 'stream',
          description: 'Streaming payments protocol',
        },
        {
          name: 'Custom Endpoint',
          value: 'custom',
          description: 'Custom ILP endpoint configuration',
        },
      ],
      default: 'rafiki',
      description: 'The type of Interledger configuration to use',
    },
    {
      displayName: 'Wallet Address (Payment Pointer)',
      name: 'walletAddress',
      type: 'string',
      default: '',
      placeholder: '$wallet.example.com/alice',
      description:
        'Payment pointer or wallet address URL. Format: $host/path or https://host/.well-known/pay',
      required: true,
    },
    {
      displayName: 'Private Key (Ed25519)',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description:
        'Ed25519 private key in base64 format for signing HTTP requests. Keep this secret!',
      required: true,
    },
    {
      displayName: 'Public Key',
      name: 'publicKey',
      type: 'string',
      default: '',
      description: 'Ed25519 public key in base64 format. Used for key registration.',
      required: true,
    },
    {
      displayName: 'Key ID',
      name: 'keyId',
      type: 'string',
      default: '',
      placeholder: 'my-key-2024',
      description: 'Unique identifier for the key pair, used in HTTP signatures',
      required: true,
    },
    {
      displayName: 'Connector URL',
      name: 'connectorUrl',
      type: 'string',
      default: '',
      placeholder: 'https://connector.example.com',
      description: 'ILP connector base URL',
      displayOptions: {
        show: {
          configurationType: ['connector', 'custom'],
        },
      },
    },
    {
      displayName: 'ILP Address',
      name: 'ilpAddress',
      type: 'string',
      default: '',
      placeholder: 'g.example.alice',
      description: 'ILP address for this account (e.g., g.example.alice)',
      displayOptions: {
        show: {
          configurationType: ['connector', 'stream', 'custom'],
        },
      },
    },
    {
      displayName: 'Asset Code',
      name: 'assetCode',
      type: 'string',
      default: 'USD',
      placeholder: 'USD',
      description: 'ISO 4217 currency code or asset identifier (e.g., USD, EUR, XRP)',
    },
    {
      displayName: 'Asset Scale',
      name: 'assetScale',
      type: 'number',
      default: 2,
      description:
        'Number of decimal places for the asset (e.g., 2 for USD cents, 9 for XRP drops)',
    },
    {
      displayName: 'Shared Secret',
      name: 'sharedSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Shared secret for STREAM protocol connections (base64)',
      displayOptions: {
        show: {
          configurationType: ['stream'],
        },
      },
    },
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Production',
          value: 'production',
        },
        {
          name: 'Testnet',
          value: 'testnet',
        },
        {
          name: 'Local',
          value: 'local',
        },
      ],
      default: 'testnet',
      description: 'The environment to connect to',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.walletAddress.startsWith("$") ? "https://" + $credentials.walletAddress.substring(1).split("/")[0] : $credentials.walletAddress}}',
      url: '/.well-known/pay',
      method: 'GET',
    },
  };
}
