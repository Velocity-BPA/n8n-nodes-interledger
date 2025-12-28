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
 * Rafiki Admin Credentials
 *
 * Rafiki is an open-source implementation of the Open Payments standard.
 * The Admin API provides GraphQL access to manage:
 * - Wallet addresses
 * - Assets
 * - Peers
 * - Liquidity
 * - Payments
 *
 * This credential type provides access to the Rafiki Admin GraphQL API.
 */
export class RafikiAdmin implements ICredentialType {
  name = 'rafikiAdmin';
  displayName = 'Rafiki Admin';
  documentationUrl = 'https://rafiki.dev/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'Rafiki Admin URL',
      name: 'adminUrl',
      type: 'string',
      default: '',
      placeholder: 'https://admin.rafiki.example.com',
      description: 'Base URL of the Rafiki Admin API',
      required: true,
    },
    {
      displayName: 'GraphQL Endpoint',
      name: 'graphqlEndpoint',
      type: 'string',
      default: '/graphql',
      placeholder: '/graphql',
      description: 'Path to the GraphQL endpoint (usually /graphql)',
    },
    {
      displayName: 'Admin API Key',
      name: 'adminApiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'API key for authenticating with the Rafiki Admin API',
      required: true,
    },
    {
      displayName: 'Authentication Method',
      name: 'authMethod',
      type: 'options',
      options: [
        {
          name: 'API Key (Header)',
          value: 'apiKey',
          description: 'Send API key in Authorization header',
        },
        {
          name: 'Bearer Token',
          value: 'bearer',
          description: 'Send as Bearer token',
        },
        {
          name: 'Custom Header',
          value: 'custom',
          description: 'Use a custom header name',
        },
      ],
      default: 'apiKey',
      description: 'How to send the API key',
    },
    {
      displayName: 'Custom Header Name',
      name: 'customHeaderName',
      type: 'string',
      default: 'X-API-Key',
      description: 'Name of the custom header for API key',
      displayOptions: {
        show: {
          authMethod: ['custom'],
        },
      },
    },
    {
      displayName: 'Backend Admin URL',
      name: 'backendAdminUrl',
      type: 'string',
      default: '',
      placeholder: 'https://backend.rafiki.example.com',
      description: 'URL for backend admin operations (if different from main admin URL)',
    },
    {
      displayName: 'Auth Admin URL',
      name: 'authAdminUrl',
      type: 'string',
      default: '',
      placeholder: 'https://auth.rafiki.example.com',
      description: 'URL for auth admin operations (if different from main admin URL)',
    },
    {
      displayName: 'Enable Introspection',
      name: 'enableIntrospection',
      type: 'boolean',
      default: true,
      description: 'Whether to enable GraphQL introspection for schema discovery',
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
          name: 'Staging',
          value: 'staging',
        },
        {
          name: 'Development',
          value: 'development',
        },
        {
          name: 'Local',
          value: 'local',
        },
      ],
      default: 'development',
      description: 'The Rafiki environment',
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
    properties: {
      headers: {
        Authorization:
          '={{$credentials.authMethod === "bearer" ? "Bearer " + $credentials.adminApiKey : $credentials.adminApiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.adminUrl}}',
      url: '={{$credentials.graphqlEndpoint}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    },
  };
}
