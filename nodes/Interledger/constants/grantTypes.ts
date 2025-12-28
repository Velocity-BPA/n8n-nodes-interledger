/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Grant Type Constants
 *
 * Open Payments uses GNAP (Grant Negotiation and Authorization Protocol)
 * for authorization. Grants provide access to wallet resources:
 *
 * - Incoming Payments: Create/manage payment receivers
 * - Outgoing Payments: Send money from wallet
 * - Quotes: Get payment cost estimates
 *
 * Grants can be:
 * - Interactive: Requires user approval
 * - Non-interactive: Auto-approved based on client identity
 */

/**
 * Access Types for Open Payments grants
 */
export const ACCESS_TYPES = {
  /** Access to incoming payment resources */
  INCOMING_PAYMENT: 'incoming-payment',
  /** Access to outgoing payment resources */
  OUTGOING_PAYMENT: 'outgoing-payment',
  /** Access to quote resources */
  QUOTE: 'quote',
} as const;

/**
 * Access Actions
 */
export const ACCESS_ACTIONS = {
  /** Create new resources */
  CREATE: 'create',
  /** Read existing resources */
  READ: 'read',
  /** Read all resources */
  READ_ALL: 'read-all',
  /** List resources */
  LIST: 'list',
  /** List all resources */
  LIST_ALL: 'list-all',
  /** Complete a resource */
  COMPLETE: 'complete',
} as const;

/**
 * Grant States
 */
export const GRANT_STATES = {
  /** Grant is pending approval */
  PENDING: 'pending',
  /** Grant has been approved */
  APPROVED: 'approved',
  /** Grant is finalized and active */
  FINALIZED: 'finalized',
  /** Grant was denied */
  DENIED: 'denied',
  /** Grant was revoked */
  REVOKED: 'revoked',
  /** Grant has expired */
  EXPIRED: 'expired',
} as const;

/**
 * Interaction Types
 */
export const INTERACTION_TYPES = {
  /** Redirect user for approval */
  REDIRECT: 'redirect',
  /** Display approval in app */
  APP: 'app',
  /** User action outside of client */
  USER_CODE: 'user_code',
} as const;

/**
 * Finish Methods for interaction
 */
export const FINISH_METHODS = {
  /** Redirect back to client */
  REDIRECT: 'redirect',
  /** Push notification to client */
  PUSH: 'push',
} as const;

/**
 * Grant access type definition
 */
export interface GrantAccess {
  type: keyof typeof ACCESS_TYPES | string;
  actions: (keyof typeof ACCESS_ACTIONS | string)[];
  identifier?: string;
  limits?: GrantLimits;
}

/**
 * Grant limits
 */
export interface GrantLimits {
  /** Maximum amount per payment */
  sendAmount?: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  /** Maximum amount to receive */
  receiveAmount?: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  /** Payment receiver */
  receiver?: string;
  /** Interval for recurring access */
  interval?: string;
}

/**
 * Grant request structure
 */
export interface GrantRequest {
  access_token: {
    access: GrantAccess[];
  };
  client: string;
  interact?: {
    start: (keyof typeof INTERACTION_TYPES)[];
    finish?: {
      method: keyof typeof FINISH_METHODS;
      uri: string;
      nonce: string;
    };
  };
}

/**
 * Grant response structure
 */
export interface GrantResponse {
  access_token?: {
    value: string;
    manage: string;
    expires_in?: number;
    access: GrantAccess[];
  };
  continue?: {
    access_token: {
      value: string;
    };
    uri: string;
    wait?: number;
  };
  interact?: {
    redirect?: string;
    finish?: string;
  };
}

/**
 * Predefined grant configurations
 */
export const GRANT_PRESETS = {
  /** Full incoming payment access */
  INCOMING_FULL: {
    type: ACCESS_TYPES.INCOMING_PAYMENT,
    actions: [ACCESS_ACTIONS.CREATE, ACCESS_ACTIONS.READ, ACCESS_ACTIONS.LIST, ACCESS_ACTIONS.COMPLETE],
  },
  /** Read-only incoming payment access */
  INCOMING_READ: {
    type: ACCESS_TYPES.INCOMING_PAYMENT,
    actions: [ACCESS_ACTIONS.READ, ACCESS_ACTIONS.LIST],
  },
  /** Full outgoing payment access */
  OUTGOING_FULL: {
    type: ACCESS_TYPES.OUTGOING_PAYMENT,
    actions: [ACCESS_ACTIONS.CREATE, ACCESS_ACTIONS.READ, ACCESS_ACTIONS.LIST],
  },
  /** Read-only outgoing payment access */
  OUTGOING_READ: {
    type: ACCESS_TYPES.OUTGOING_PAYMENT,
    actions: [ACCESS_ACTIONS.READ, ACCESS_ACTIONS.LIST],
  },
  /** Full quote access */
  QUOTE_FULL: {
    type: ACCESS_TYPES.QUOTE,
    actions: [ACCESS_ACTIONS.CREATE, ACCESS_ACTIONS.READ],
  },
} as const;

/**
 * Grant continuation structure
 */
export interface GrantContinuation {
  access_token: {
    value: string;
  };
  uri: string;
  wait?: number;
}

/**
 * Check if grant is active
 */
export function isGrantActive(state: string): boolean {
  return state === GRANT_STATES.APPROVED || state === GRANT_STATES.FINALIZED;
}

/**
 * Check if grant requires interaction
 */
export function requiresInteraction(response: GrantResponse): boolean {
  return !!response.interact?.redirect;
}

/**
 * Check if grant can be continued
 */
export function canContinue(response: GrantResponse): boolean {
  return !!response.continue?.uri;
}

/**
 * Build access token header
 */
export function buildAccessTokenHeader(token: string): string {
  return `GNAP ${token}`;
}

/**
 * Parse access token from header
 */
export function parseAccessTokenHeader(header: string): string | null {
  if (header.startsWith('GNAP ')) {
    return header.substring(5);
  }
  return null;
}

/**
 * Grant duration constants
 */
export const GRANT_DURATIONS = {
  /** 1 hour in seconds */
  ONE_HOUR: 3600,
  /** 1 day in seconds */
  ONE_DAY: 86400,
  /** 1 week in seconds */
  ONE_WEEK: 604800,
  /** 30 days in seconds */
  THIRTY_DAYS: 2592000,
  /** 1 year in seconds */
  ONE_YEAR: 31536000,
} as const;

/**
 * Interval formats for recurring grants
 */
export const INTERVAL_FORMATS = {
  /** Daily recurrence */
  DAILY: 'R/P1D',
  /** Weekly recurrence */
  WEEKLY: 'R/P1W',
  /** Monthly recurrence */
  MONTHLY: 'R/P1M',
  /** Yearly recurrence */
  YEARLY: 'R/P1Y',
} as const;
