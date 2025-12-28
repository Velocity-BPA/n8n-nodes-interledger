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
 * Open Payments Credentials
 *
 * Open Payments is a standard API for interacting with Interledger wallets.
 * This credential type supports the full Open Payments authentication flow
 * using GNAP (Grant Negotiation and Authorization Protocol).
 *
 * Key concepts:
 * - Wallet Address: The URL identifying the wallet (e.g., https://wallet.example.com/alice)
 * - Authorization Server: GNAP-compliant server for obtaining grants
 * - Access Tokens: Tokens for accessing incoming/outgoing payment resources
 */
export class OpenPayments implements ICredentialType {
  name = 'openPayments';
  displayName = 'Open Payments';
  documentationUrl = 'https://openpayments.dev';
  properties: INodeProperties[] = [
    {
      displayName: 'Wallet Address URL',
      name: 'walletAddressUrl',
      type: 'string',
      default: '',
      placeholder: 'https://wallet.example.com/alice',
      description:
        'The full URL of the wallet address. Can also use payment pointer format ($wallet.example.com/alice)',
      required: true,
    },
    {
      displayName: 'Client Public Key',
      name: 'clientPublicKey',
      type: 'string',
      default: '',
      description: 'Ed25519 public key in base64 format for client identification',
      required: true,
    },
    {
      displayName: 'Client Private Key',
      name: 'clientPrivateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Ed25519 private key in base64 format for signing requests. Never share this!',
      required: true,
    },
    {
      displayName: 'Key ID',
      name: 'keyId',
      type: 'string',
      default: '',
      placeholder: 'key-id-2024',
      description: 'Unique identifier for this key pair, used in HTTP signatures',
      required: true,
    },
    {
      displayName: 'Authorization Server URL',
      name: 'authServerUrl',
      type: 'string',
      default: '',
      placeholder: 'https://auth.wallet.example.com',
      description:
        'URL of the GNAP authorization server. Usually discovered from wallet address metadata',
    },
    {
      displayName: 'Incoming Payment Access Token',
      name: 'incomingPaymentAccessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Pre-obtained access token for incoming payment operations (optional)',
    },
    {
      displayName: 'Outgoing Payment Access Token',
      name: 'outgoingPaymentAccessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Pre-obtained access token for outgoing payment operations (optional)',
    },
    {
      displayName: 'Quote Access Token',
      name: 'quoteAccessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Pre-obtained access token for quote operations (optional)',
    },
    {
      displayName: 'Client Display Name',
      name: 'clientDisplayName',
      type: 'string',
      default: '',
      placeholder: 'My n8n Workflow',
      description: 'Display name shown to users during authorization',
    },
    {
      displayName: 'Client URI',
      name: 'clientUri',
      type: 'string',
      default: '',
      placeholder: 'https://myapp.example.com',
      description: 'URI of the client application for grant requests',
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
          name: 'Sandbox',
          value: 'sandbox',
        },
        {
          name: 'Local Development',
          value: 'local',
        },
      ],
      default: 'sandbox',
      description: 'The Open Payments environment',
    },
    {
      displayName: 'Timeout (ms)',
      name: 'timeout',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL:
        '={{$credentials.walletAddressUrl.startsWith("$") ? "https://" + $credentials.walletAddressUrl.substring(1) : $credentials.walletAddressUrl}}',
      url: '/',
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  };
}
