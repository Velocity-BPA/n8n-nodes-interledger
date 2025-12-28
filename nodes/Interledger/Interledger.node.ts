/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';

import {
  createPreparePacket,
  createFulfillPacket,
  createRejectPacket,
  serializePacket,
  deserializePacket,
  generateConditionAndFulfillment,
} from './utils/packetUtils';

import {
  isValidIlpAddress,
  paymentPointerToUrl,
} from './constants/addresses';

import { toIntegerAmount, toDisplayAmount } from './utils/amountUtils';
import { generateKeyPair } from './utils/signatureUtils';
import { showLicensingNotice } from './utils';

// Show licensing notice on node load
showLicensingNotice();

// Helper functions that receive IExecuteFunctions context
function executeUtility(context: IExecuteFunctions, operation: string, i: number): IDataObject {
  switch (operation) {
    case 'validatePaymentPointer': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const isValid = pointer.startsWith('$') && pointer.length > 1;
      let url = '';
      try {
        url = paymentPointerToUrl(pointer);
      } catch {
        // Invalid pointer
      }
      return { valid: isValid, pointer, url };
    }
    case 'parsePaymentPointer': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const url = paymentPointerToUrl(pointer);
      const parsed = new URL(url);
      return { pointer, url, host: parsed.host, path: parsed.pathname };
    }
    case 'validateIlpAddress': {
      const address = context.getNodeParameter('ilpAddress', i) as string;
      return { valid: isValidIlpAddress(address), address };
    }
    case 'formatIlpAddress': {
      const address = context.getNodeParameter('ilpAddress', i) as string;
      return { formatted: address, valid: isValidIlpAddress(address) };
    }
    case 'convertAmount': {
      const amount = context.getNodeParameter('amount', i) as string;
      const sourceScale = context.getNodeParameter('sourceScale', i) as number;
      const targetScale = context.getNodeParameter('targetScale', i) as number;
      const intAmount = toIntegerAmount(amount, sourceScale);
      const displayAmount = toDisplayAmount(intAmount, targetScale);
      return { original: amount, converted: displayAmount, sourceScale, targetScale };
    }
    case 'generateKeyPair': {
      const keys = generateKeyPair();
      return { publicKey: keys.publicKey, privateKey: keys.privateKey };
    }
    case 'getProtocolVersion': {
      return { ilp: '4.0.0', stream: '1.0.0', openPayments: '1.0', spsp: '2.0.0' };
    }
    default:
      throw new Error(`Unknown utility operation: ${operation}`);
  }
}

function executeIlpPacket(context: IExecuteFunctions, operation: string, i: number): IDataObject {
  switch (operation) {
    case 'createPrepare': {
      const destination = context.getNodeParameter('destination', i) as string;
      const amount = context.getNodeParameter('amount', i) as string;
      const executionCondition = context.getNodeParameter('executionCondition', i, '') as string;
      const expiresAt = context.getNodeParameter('expiresAt', i, '') as string;
      const data = context.getNodeParameter('data', i, '') as string;

      let condition: Buffer;
      let fulfillment: string | undefined;

      if (executionCondition) {
        condition = Buffer.from(executionCondition, 'base64');
      } else {
        const generated = generateConditionAndFulfillment();
        condition = generated.condition;
        fulfillment = generated.fulfillment.toString('base64');
      }

      const packet = createPreparePacket({
        destination,
        amount,
        executionCondition: condition,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30000),
        data: data ? Buffer.from(data, 'base64') : Buffer.alloc(0),
      });

      const serialized = serializePacket(packet);
      return {
        type: 'PREPARE',
        destination,
        amount,
        condition: condition.toString('base64'),
        fulfillment,
        expiresAt: packet.expiresAt.toISOString(),
        serialized: serialized.toString('base64'),
      };
    }
    case 'createFulfill': {
      const fulfillment = context.getNodeParameter('fulfillment', i) as string;
      const data = context.getNodeParameter('data', i, '') as string;

      const packet = createFulfillPacket({
        fulfillment: Buffer.from(fulfillment, 'base64'),
        data: data ? Buffer.from(data, 'base64') : Buffer.alloc(0),
      });

      const serialized = serializePacket(packet);
      return {
        type: 'FULFILL',
        fulfillment,
        serialized: serialized.toString('base64'),
      };
    }
    case 'createReject': {
      const code = context.getNodeParameter('errorCode', i) as string;
      const message = context.getNodeParameter('errorMessage', i, '') as string;
      const triggeredBy = context.getNodeParameter('triggeredBy', i, '') as string;
      const data = context.getNodeParameter('data', i, '') as string;

      const packet = createRejectPacket({
        code,
        message,
        triggeredBy,
        data: data ? Buffer.from(data, 'base64') : Buffer.alloc(0),
      });

      const serialized = serializePacket(packet);
      return {
        type: 'REJECT',
        code,
        message,
        triggeredBy,
        serialized: serialized.toString('base64'),
      };
    }
    case 'parse': {
      const packetData = context.getNodeParameter('packetData', i) as string;
      const packet = deserializePacket(Buffer.from(packetData, 'base64'));
      return packet as unknown as IDataObject;
    }
    case 'generateCondition': {
      const generated = generateConditionAndFulfillment();
      return {
        condition: generated.condition.toString('base64'),
        fulfillment: generated.fulfillment.toString('base64'),
      };
    }
    default:
      throw new Error(`Unknown ILP packet operation: ${operation}`);
  }
}

function executePaymentPointer(context: IExecuteFunctions, operation: string, i: number): IDataObject {
  switch (operation) {
    case 'resolve': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const url = paymentPointerToUrl(pointer);
      return { pointer, url, resolved: true };
    }
    case 'validate': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const isValid = pointer.startsWith('$') && pointer.length > 1 && !pointer.includes(' ');
      return { pointer, valid: isValid };
    }
    case 'getMetadata': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const url = paymentPointerToUrl(pointer);
      const parsed = new URL(url);
      return {
        pointer,
        url,
        host: parsed.host,
        path: parsed.pathname,
        protocol: parsed.protocol,
      };
    }
    default:
      throw new Error(`Unknown payment pointer operation: ${operation}`);
  }
}

function executeWebMonetization(context: IExecuteFunctions, operation: string, i: number): IDataObject {
  switch (operation) {
    case 'createLink': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const metaTag = `<meta name="monetization" content="${pointer}">`;
      const linkTag = `<link rel="monetization" href="${paymentPointerToUrl(pointer)}">`;
      return { pointer, metaTag, linkTag };
    }
    case 'verify':
    case 'getStatus':
    case 'getReceipt': {
      return {
        message: 'Web Monetization verification requires browser-side implementation',
        operation,
        hint: 'Configure Web Monetization in your HTML and use the Receipt Verifier API',
      };
    }
    default:
      throw new Error(`Unknown web monetization operation: ${operation}`);
  }
}

async function executeOpenPaymentsOperation(
  _context: IExecuteFunctions,
  resource: string,
  operation: string,
  _i: number
): Promise<IDataObject> {
  // Common Open Payments response structure
  return {
    resource,
    operation,
    status: 'pending_client_setup',
    message: `Open Payments ${resource}/${operation} requires a properly configured Open Payments client`,
    hint: 'Configure OpenPayments credentials with wallet address, private key, and key ID',
    documentation: 'https://openpayments.guide',
  };
}

async function executeRafikiOperation(
  _context: IExecuteFunctions,
  operation: string,
  _i: number
): Promise<IDataObject> {
  switch (operation) {
    case 'getHealth':
      return {
        operation: 'getHealth',
        message: 'Rafiki health check requires configured Rafiki Admin credentials',
        hint: 'Configure RafikiAdmin credentials with admin URL and API key',
      };
    case 'getStats':
      return {
        operation: 'getStats',
        message: 'Rafiki stats requires configured Rafiki Admin credentials',
      };
    case 'createWalletAddress':
    case 'getWalletAddress':
    case 'createAsset':
    case 'getAsset':
    case 'createPeer':
    case 'getPeer':
      return {
        operation,
        message: `Rafiki ${operation} requires GraphQL client setup`,
        hint: 'Configure RafikiAdmin credentials and ensure Rafiki instance is running',
        documentation: 'https://rafiki.dev/docs',
      };
    default:
      throw new Error(`Unknown Rafiki operation: ${operation}`);
  }
}

async function executeStreamOperation(
  _context: IExecuteFunctions,
  operation: string,
  _i: number
): Promise<IDataObject> {
  switch (operation) {
    case 'createConnection':
      return {
        operation: 'createConnection',
        message: 'STREAM connection creation requires ilp-protocol-stream client',
        hint: 'Configure SPSP credentials with shared secret',
      };
    case 'sendMoney':
      return {
        operation: 'sendMoney',
        message: 'STREAM payment requires active connection',
        hint: 'First create a connection, then send money',
      };
    case 'receiveMoney':
      return {
        operation: 'receiveMoney',
        message: 'STREAM receive requires receiver setup',
        hint: 'Configure receiver with shared secret and ILP address',
      };
    default:
      throw new Error(`Unknown STREAM operation: ${operation}`);
  }
}

async function executeSpspOperation(
  context: IExecuteFunctions,
  operation: string,
  i: number
): Promise<IDataObject> {
  switch (operation) {
    case 'query': {
      const pointer = context.getNodeParameter('paymentPointer', i) as string;
      const url = paymentPointerToUrl(pointer);
      return {
        operation: 'query',
        pointer,
        url,
        message: 'SPSP query will fetch destination account and shared secret',
        hint: 'Requires HTTP request to SPSP endpoint with Accept: application/spsp4+json',
      };
    }
    case 'send':
      return {
        operation: 'send',
        message: 'SPSP send requires STREAM connection',
        hint: 'Query SPSP endpoint first, then create STREAM connection',
      };
    default:
      throw new Error(`Unknown SPSP operation: ${operation}`);
  }
}

function executeGenericOperation(
  _context: IExecuteFunctions,
  resource: string,
  operation: string,
  _i: number
): IDataObject {
  return {
    resource,
    operation,
    message: `${resource}/${operation} operation requires specific client configuration`,
    hint: 'Ensure appropriate credentials are configured',
    timestamp: new Date().toISOString(),
  };
}

export class Interledger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Interledger',
    name: 'interledger',
    icon: 'file:interledger.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Interledger Protocol - Open Payments, STREAM, SPSP, Rafiki',
    defaults: {
      name: 'Interledger',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'interledgerApi',
        required: false,
        displayOptions: {
          show: {
            resource: ['utility', 'ilpPacket', 'paymentPointer', 'connector', 'peer', 'route', 'account'],
          },
        },
      },
      {
        name: 'openPaymentsApi',
        required: false,
        displayOptions: {
          show: {
            resource: ['walletAddress', 'incomingPayment', 'outgoingPayment', 'quote', 'grant', 'payment', 'exchange', 'webMonetization'],
          },
        },
      },
      {
        name: 'rafikiAdminApi',
        required: false,
        displayOptions: {
          show: {
            resource: ['rafikiAdmin', 'asset', 'liquidity', 'webhook'],
          },
        },
      },
      {
        name: 'spspApi',
        required: false,
        displayOptions: {
          show: {
            resource: ['spsp', 'stream'],
          },
        },
      },
    ],
    properties: [
      // Resource Selection
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Account', value: 'account', description: 'Connector account operations' },
          { name: 'Asset', value: 'asset', description: 'Asset management' },
          { name: 'Connector', value: 'connector', description: 'ILP Connector operations' },
          { name: 'Exchange', value: 'exchange', description: 'Currency exchange operations' },
          { name: 'Grant', value: 'grant', description: 'Open Payments grant management' },
          { name: 'ILP Packet', value: 'ilpPacket', description: 'Create and parse ILP packets' },
          { name: 'Incoming Payment', value: 'incomingPayment', description: 'Receive payments via Open Payments' },
          { name: 'Liquidity', value: 'liquidity', description: 'Liquidity management' },
          { name: 'Outgoing Payment', value: 'outgoingPayment', description: 'Send payments via Open Payments' },
          { name: 'Payment', value: 'payment', description: 'High-level payment operations' },
          { name: 'Payment Pointer', value: 'paymentPointer', description: 'Payment pointer resolution' },
          { name: 'Peer', value: 'peer', description: 'Connector peer management' },
          { name: 'Quote', value: 'quote', description: 'Payment quotes' },
          { name: 'Rafiki Admin', value: 'rafikiAdmin', description: 'Rafiki administration' },
          { name: 'Route', value: 'route', description: 'Routing operations' },
          { name: 'SPSP', value: 'spsp', description: 'Simple Payment Setup Protocol' },
          { name: 'STREAM', value: 'stream', description: 'STREAM protocol operations' },
          { name: 'Utility', value: 'utility', description: 'Utility functions' },
          { name: 'Wallet Address', value: 'walletAddress', description: 'Open Payments wallet addresses' },
          { name: 'Web Monetization', value: 'webMonetization', description: 'Web Monetization features' },
          { name: 'Webhook', value: 'webhook', description: 'Webhook management' },
        ],
        default: 'utility',
      },

      // Utility Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['utility'] } },
        options: [
          { name: 'Convert Amount', value: 'convertAmount', description: 'Convert amount between scales' },
          { name: 'Format ILP Address', value: 'formatIlpAddress', description: 'Format an ILP address' },
          { name: 'Generate Key Pair', value: 'generateKeyPair', description: 'Generate Ed25519 key pair' },
          { name: 'Get Protocol Version', value: 'getProtocolVersion', description: 'Get supported protocol versions' },
          { name: 'Parse Payment Pointer', value: 'parsePaymentPointer', description: 'Parse a payment pointer' },
          { name: 'Validate ILP Address', value: 'validateIlpAddress', description: 'Validate an ILP address' },
          { name: 'Validate Payment Pointer', value: 'validatePaymentPointer', description: 'Validate a payment pointer' },
        ],
        default: 'validatePaymentPointer',
      },

      // ILP Packet Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['ilpPacket'] } },
        options: [
          { name: 'Create Fulfill', value: 'createFulfill', description: 'Create ILP Fulfill packet' },
          { name: 'Create Prepare', value: 'createPrepare', description: 'Create ILP Prepare packet' },
          { name: 'Create Reject', value: 'createReject', description: 'Create ILP Reject packet' },
          { name: 'Generate Condition', value: 'generateCondition', description: 'Generate condition/fulfillment pair' },
          { name: 'Parse', value: 'parse', description: 'Parse an ILP packet' },
        ],
        default: 'createPrepare',
      },

      // Wallet Address Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['walletAddress'] } },
        options: [
          { name: 'Get', value: 'get', description: 'Get wallet address details' },
          { name: 'Get Keys', value: 'getKeys', description: 'Get wallet address public keys' },
          { name: 'Resolve', value: 'resolve', description: 'Resolve wallet address URL' },
        ],
        default: 'get',
      },

      // Incoming Payment Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['incomingPayment'] } },
        options: [
          { name: 'Complete', value: 'complete', description: 'Complete an incoming payment' },
          { name: 'Create', value: 'create', description: 'Create an incoming payment' },
          { name: 'Get', value: 'get', description: 'Get an incoming payment' },
          { name: 'List', value: 'list', description: 'List incoming payments' },
        ],
        default: 'create',
      },

      // Outgoing Payment Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['outgoingPayment'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Create an outgoing payment' },
          { name: 'Get', value: 'get', description: 'Get an outgoing payment' },
          { name: 'List', value: 'list', description: 'List outgoing payments' },
        ],
        default: 'create',
      },

      // Quote Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['quote'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Create a quote' },
          { name: 'Get', value: 'get', description: 'Get a quote' },
        ],
        default: 'create',
      },

      // Grant Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['grant'] } },
        options: [
          { name: 'Cancel', value: 'cancel', description: 'Cancel a grant' },
          { name: 'Continue', value: 'continue', description: 'Continue grant flow' },
          { name: 'Request', value: 'request', description: 'Request a new grant' },
          { name: 'Revoke', value: 'revoke', description: 'Revoke a grant' },
        ],
        default: 'request',
      },

      // SPSP Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['spsp'] } },
        options: [
          { name: 'Query', value: 'query', description: 'Query SPSP endpoint' },
          { name: 'Send', value: 'send', description: 'Send payment via SPSP' },
        ],
        default: 'query',
      },

      // STREAM Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['stream'] } },
        options: [
          { name: 'Create Connection', value: 'createConnection', description: 'Create STREAM connection' },
          { name: 'Receive Money', value: 'receiveMoney', description: 'Receive via STREAM' },
          { name: 'Send Money', value: 'sendMoney', description: 'Send via STREAM' },
        ],
        default: 'createConnection',
      },

      // Rafiki Admin Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['rafikiAdmin'] } },
        options: [
          { name: 'Create Asset', value: 'createAsset', description: 'Create an asset' },
          { name: 'Create Peer', value: 'createPeer', description: 'Create a peer' },
          { name: 'Create Wallet Address', value: 'createWalletAddress', description: 'Create wallet address' },
          { name: 'Get Asset', value: 'getAsset', description: 'Get an asset' },
          { name: 'Get Health', value: 'getHealth', description: 'Get Rafiki health status' },
          { name: 'Get Peer', value: 'getPeer', description: 'Get a peer' },
          { name: 'Get Stats', value: 'getStats', description: 'Get Rafiki statistics' },
          { name: 'Get Wallet Address', value: 'getWalletAddress', description: 'Get wallet address' },
        ],
        default: 'getHealth',
      },

      // Payment Pointer Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['paymentPointer'] } },
        options: [
          { name: 'Get Metadata', value: 'getMetadata', description: 'Get payment pointer metadata' },
          { name: 'Resolve', value: 'resolve', description: 'Resolve payment pointer to URL' },
          { name: 'Validate', value: 'validate', description: 'Validate payment pointer format' },
        ],
        default: 'resolve',
      },

      // Web Monetization Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['webMonetization'] } },
        options: [
          { name: 'Create Link', value: 'createLink', description: 'Create monetization meta tag' },
          { name: 'Get Receipt', value: 'getReceipt', description: 'Get monetization receipt' },
          { name: 'Get Status', value: 'getStatus', description: 'Get monetization status' },
          { name: 'Verify', value: 'verify', description: 'Verify monetization' },
        ],
        default: 'createLink',
      },

      // Generic Operations for other resources
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['connector', 'peer', 'route', 'account', 'asset', 'liquidity', 'payment', 'exchange', 'webhook'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Create resource' },
          { name: 'Delete', value: 'delete', description: 'Delete resource' },
          { name: 'Get', value: 'get', description: 'Get resource' },
          { name: 'List', value: 'list', description: 'List resources' },
          { name: 'Update', value: 'update', description: 'Update resource' },
        ],
        default: 'get',
      },

      // Common Parameters
      {
        displayName: 'Payment Pointer',
        name: 'paymentPointer',
        type: 'string',
        default: '',
        placeholder: '$wallet.example.com/alice',
        description: 'Payment pointer (e.g., $wallet.example.com/alice)',
        displayOptions: {
          show: {
            resource: ['utility', 'paymentPointer', 'spsp', 'webMonetization', 'walletAddress'],
            operation: ['validatePaymentPointer', 'parsePaymentPointer', 'resolve', 'validate', 'getMetadata', 'query', 'createLink', 'get'],
          },
        },
      },

      {
        displayName: 'ILP Address',
        name: 'ilpAddress',
        type: 'string',
        default: '',
        placeholder: 'g.example.user',
        description: 'ILP address (e.g., g.example.user)',
        displayOptions: {
          show: {
            resource: ['utility'],
            operation: ['validateIlpAddress', 'formatIlpAddress'],
          },
        },
      },

      {
        displayName: 'Amount',
        name: 'amount',
        type: 'string',
        default: '',
        description: 'Amount to convert or send',
        displayOptions: {
          show: {
            resource: ['utility', 'ilpPacket'],
            operation: ['convertAmount', 'createPrepare'],
          },
        },
      },

      {
        displayName: 'Source Scale',
        name: 'sourceScale',
        type: 'number',
        default: 2,
        description: 'Source asset scale (decimal places)',
        displayOptions: {
          show: {
            resource: ['utility'],
            operation: ['convertAmount'],
          },
        },
      },

      {
        displayName: 'Target Scale',
        name: 'targetScale',
        type: 'number',
        default: 9,
        description: 'Target asset scale (decimal places)',
        displayOptions: {
          show: {
            resource: ['utility'],
            operation: ['convertAmount'],
          },
        },
      },

      // ILP Packet Parameters
      {
        displayName: 'Destination',
        name: 'destination',
        type: 'string',
        default: '',
        placeholder: 'g.example.receiver',
        description: 'Destination ILP address',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createPrepare'],
          },
        },
      },

      {
        displayName: 'Execution Condition',
        name: 'executionCondition',
        type: 'string',
        default: '',
        description: 'Base64-encoded condition (leave empty to auto-generate)',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createPrepare'],
          },
        },
      },

      {
        displayName: 'Expires At',
        name: 'expiresAt',
        type: 'dateTime',
        default: '',
        description: 'Packet expiration time',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createPrepare'],
          },
        },
      },

      {
        displayName: 'Fulfillment',
        name: 'fulfillment',
        type: 'string',
        default: '',
        description: 'Base64-encoded fulfillment',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createFulfill'],
          },
        },
      },

      {
        displayName: 'Error Code',
        name: 'errorCode',
        type: 'options',
        options: [
          { name: 'F00 - Bad Request', value: 'F00' },
          { name: 'F01 - Invalid Packet', value: 'F01' },
          { name: 'F02 - Unreachable', value: 'F02' },
          { name: 'F03 - Invalid Amount', value: 'F03' },
          { name: 'F04 - Insufficient Destination Amount', value: 'F04' },
          { name: 'F05 - Wrong Condition', value: 'F05' },
          { name: 'F06 - Unexpected Payment', value: 'F06' },
          { name: 'F07 - Cannot Receive', value: 'F07' },
          { name: 'F08 - Amount Too Large', value: 'F08' },
          { name: 'F09 - Amount Too Small', value: 'F09' },
          { name: 'R00 - Transfer Timed Out', value: 'R00' },
          { name: 'R01 - Insufficient Liquidity', value: 'R01' },
          { name: 'R02 - Insufficient Timeout', value: 'R02' },
          { name: 'T00 - Internal Error', value: 'T00' },
          { name: 'T01 - Peer Unreachable', value: 'T01' },
          { name: 'T02 - Peer Busy', value: 'T02' },
          { name: 'T03 - Connector Busy', value: 'T03' },
          { name: 'T04 - Insufficient Liquidity', value: 'T04' },
          { name: 'T05 - Rate Limited', value: 'T05' },
        ],
        default: 'F00',
        description: 'ILP error code',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createReject'],
          },
        },
      },

      {
        displayName: 'Error Message',
        name: 'errorMessage',
        type: 'string',
        default: '',
        description: 'Human-readable error message',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createReject'],
          },
        },
      },

      {
        displayName: 'Triggered By',
        name: 'triggeredBy',
        type: 'string',
        default: '',
        placeholder: 'g.example.connector',
        description: 'ILP address of the node that triggered the error',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createReject'],
          },
        },
      },

      {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        default: '',
        description: 'Base64-encoded additional data',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['createPrepare', 'createFulfill', 'createReject'],
          },
        },
      },

      {
        displayName: 'Packet Data',
        name: 'packetData',
        type: 'string',
        default: '',
        description: 'Base64-encoded ILP packet to parse',
        displayOptions: {
          show: {
            resource: ['ilpPacket'],
            operation: ['parse'],
          },
        },
      },

      // Resource ID for various operations
      {
        displayName: 'Resource ID',
        name: 'resourceId',
        type: 'string',
        default: '',
        description: 'ID of the resource',
        displayOptions: {
          show: {
            operation: ['get', 'update', 'delete', 'complete'],
          },
          hide: {
            resource: ['utility', 'ilpPacket', 'paymentPointer', 'webMonetization'],
          },
        },
      },

      // Wallet Address URL
      {
        displayName: 'Wallet Address URL',
        name: 'walletAddressUrl',
        type: 'string',
        default: '',
        placeholder: 'https://wallet.example.com/alice',
        description: 'Full URL of the wallet address',
        displayOptions: {
          show: {
            resource: ['incomingPayment', 'outgoingPayment', 'quote', 'grant'],
            operation: ['create', 'list'],
          },
        },
      },

      // Incoming Amount
      {
        displayName: 'Incoming Amount',
        name: 'incomingAmount',
        type: 'fixedCollection',
        default: {},
        placeholder: 'Add Amount',
        options: [
          {
            name: 'amount',
            displayName: 'Amount',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Amount value as integer string',
              },
              {
                displayName: 'Asset Code',
                name: 'assetCode',
                type: 'string',
                default: 'USD',
                description: 'ISO 4217 currency code',
              },
              {
                displayName: 'Asset Scale',
                name: 'assetScale',
                type: 'number',
                default: 2,
                description: 'Number of decimal places',
              },
            ],
          },
        ],
        displayOptions: {
          show: {
            resource: ['incomingPayment'],
            operation: ['create'],
          },
        },
        description: 'Expected incoming amount',
      },

      // Quote ID for outgoing payment
      {
        displayName: 'Quote ID',
        name: 'quoteId',
        type: 'string',
        default: '',
        description: 'ID of the quote to use for outgoing payment',
        displayOptions: {
          show: {
            resource: ['outgoingPayment'],
            operation: ['create'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: IDataObject = {};

        switch (resource) {
          case 'utility':
            result = executeUtility(this, operation, i);
            break;
          case 'ilpPacket':
            result = executeIlpPacket(this, operation, i);
            break;
          case 'paymentPointer':
            result = executePaymentPointer(this, operation, i);
            break;
          case 'webMonetization':
            result = executeWebMonetization(this, operation, i);
            break;
          case 'walletAddress':
          case 'incomingPayment':
          case 'outgoingPayment':
          case 'quote':
          case 'grant':
          case 'payment':
          case 'exchange':
            result = await executeOpenPaymentsOperation(this, resource, operation, i);
            break;
          case 'rafikiAdmin':
            result = await executeRafikiOperation(this, operation, i);
            break;
          case 'stream':
            result = await executeStreamOperation(this, operation, i);
            break;
          case 'spsp':
            result = await executeSpspOperation(this, operation, i);
            break;
          default:
            result = executeGenericOperation(this, resource, operation, i);
        }

        returnData.push({ json: result });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
