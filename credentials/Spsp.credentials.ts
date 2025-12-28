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
 * SPSP Credentials (Simple Payment Setup Protocol)
 *
 * SPSP is a protocol for setting up payments over ILP.
 * It provides a simple way to:
 * - Resolve payment pointers to ILP addresses
 * - Get shared secrets for STREAM connections
 * - Set up payment receivers
 *
 * SPSP queries return the destination account and shared secret
 * needed to establish a STREAM connection and send payments.
 */
export class Spsp implements ICredentialType {
  name = 'spsp';
  displayName = 'SPSP (Simple Payment Setup Protocol)';
  documentationUrl = 'https://interledger.org/rfcs/0009-simple-payment-setup-protocol/';
  properties: INodeProperties[] = [
    {
      displayName: 'Payment Pointer',
      name: 'paymentPointer',
      type: 'string',
      default: '',
      placeholder: '$wallet.example.com/alice',
      description:
        'Payment pointer for SPSP queries. Format: $host/path (resolves to https://host/.well-known/pay/path)',
      required: true,
    },
    {
      displayName: 'Receiver Endpoint',
      name: 'receiverEndpoint',
      type: 'string',
      default: '',
      placeholder: 'https://wallet.example.com/.well-known/pay',
      description:
        'Direct SPSP receiver endpoint URL (optional if payment pointer is provided)',
    },
    {
      displayName: 'Shared Secret',
      name: 'sharedSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description:
        'Pre-shared secret for STREAM connections (base64). Usually obtained from SPSP query.',
    },
    {
      displayName: 'Destination Account',
      name: 'destinationAccount',
      type: 'string',
      default: '',
      placeholder: 'g.example.receiver',
      description: 'ILP destination account address',
    },
    {
      displayName: 'Sender Payment Pointer',
      name: 'senderPaymentPointer',
      type: 'string',
      default: '',
      placeholder: '$sender.example.com/account',
      description: 'Payment pointer of the sending account (for sender identification)',
    },
    {
      displayName: 'Sender Private Key',
      name: 'senderPrivateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Ed25519 private key for signing STREAM packets (base64)',
    },
    {
      displayName: 'Sender Public Key',
      name: 'senderPublicKey',
      type: 'string',
      default: '',
      description: 'Ed25519 public key (base64)',
    },
    {
      displayName: 'Asset Code',
      name: 'assetCode',
      type: 'string',
      default: 'USD',
      description: 'Currency code for payments (e.g., USD, EUR, XRP)',
    },
    {
      displayName: 'Asset Scale',
      name: 'assetScale',
      type: 'number',
      default: 2,
      description: 'Decimal places for the asset (e.g., 2 for cents)',
    },
    {
      displayName: 'Connection Timeout (ms)',
      name: 'connectionTimeout',
      type: 'number',
      default: 30000,
      description: 'Timeout for SPSP queries and STREAM connections',
    },
    {
      displayName: 'Max Packet Amount',
      name: 'maxPacketAmount',
      type: 'string',
      default: '',
      placeholder: '1000000',
      description: 'Maximum amount per ILP packet (in smallest unit)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Accept: 'application/spsp4+json',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL:
        '={{$credentials.receiverEndpoint || ("https://" + $credentials.paymentPointer.substring(1).split("/")[0])}}',
      url: '={{$credentials.receiverEndpoint ? "" : "/.well-known/pay"}}',
      method: 'GET',
      headers: {
        Accept: 'application/spsp4+json',
      },
    },
  };
}
