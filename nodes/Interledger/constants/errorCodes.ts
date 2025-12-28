/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * ILP Error Code Constants
 *
 * ILP defines error codes for payment failures. Codes are grouped by type:
 *
 * - F__ (Final) - Unrecoverable errors, don't retry
 * - T__ (Temporary) - Transient errors, may succeed on retry
 * - R__ (Relative) - Relative errors, may succeed with different routing
 *
 * Error Format: [F/T/R][0-9][0-9]
 * Example: F00 (Bad Request), T01 (Peer Unreachable)
 */

/**
 * Final Errors (F__) - Unrecoverable, do not retry
 */
export const FINAL_ERRORS = {
  /** Bad request - malformed packet */
  F00_BAD_REQUEST: 'F00',
  /** Invalid packet - packet failed validation */
  F01_INVALID_PACKET: 'F01',
  /** Amount too large - exceeds maximum */
  F02_UNREACHABLE: 'F02',
  /** Invalid amount - wrong format */
  F03_INVALID_AMOUNT: 'F03',
  /** Insufficient destination amount */
  F04_INSUFFICIENT_DST_AMOUNT: 'F04',
  /** Wrong condition - fulfillment doesn't match */
  F05_WRONG_CONDITION: 'F05',
  /** Unexpected payment - receiver not expecting */
  F06_UNEXPECTED_PAYMENT: 'F06',
  /** Cannot receive - receiver unable to process */
  F07_CANNOT_RECEIVE: 'F07',
  /** Amount too large for destination */
  F08_AMOUNT_TOO_LARGE: 'F08',
  /** Invalid peer response */
  F09_INVALID_PEER_RESPONSE: 'F09',
  /** Rejected by receiver */
  F99_APPLICATION_ERROR: 'F99',
} as const;

/**
 * Temporary Errors (T__) - May succeed on retry
 */
export const TEMPORARY_ERRORS = {
  /** Internal error - connector internal failure */
  T00_INTERNAL_ERROR: 'T00',
  /** Peer unreachable - connection failed */
  T01_PEER_UNREACHABLE: 'T01',
  /** Peer busy - too many requests */
  T02_PEER_BUSY: 'T02',
  /** Connector busy - rate limited */
  T03_CONNECTOR_BUSY: 'T03',
  /** Insufficient liquidity - not enough funds */
  T04_INSUFFICIENT_LIQUIDITY: 'T04',
  /** Rate limited - too many requests */
  T05_RATE_LIMITED: 'T05',
  /** Application error - temporary application issue */
  T99_APPLICATION_ERROR: 'T99',
} as const;

/**
 * Relative Errors (R__) - May succeed with different routing
 */
export const RELATIVE_ERRORS = {
  /** Transfer timed out - packet expired */
  R00_TRANSFER_TIMED_OUT: 'R00',
  /** Insufficient source amount */
  R01_INSUFFICIENT_SOURCE_AMOUNT: 'R01',
  /** Insufficient timeout - not enough time */
  R02_INSUFFICIENT_TIMEOUT: 'R02',
  /** Application error - routing-related issue */
  R99_APPLICATION_ERROR: 'R99',
} as const;

/**
 * All ILP Error Codes
 */
export const ILP_ERROR_CODES = {
  ...FINAL_ERRORS,
  ...TEMPORARY_ERRORS,
  ...RELATIVE_ERRORS,
} as const;

/**
 * Error code descriptions
 */
export const ERROR_DESCRIPTIONS: Record<string, string> = {
  // Final errors
  F00: 'Bad Request - The ILP packet was malformed or invalid.',
  F01: 'Invalid Packet - The packet failed validation checks.',
  F02: 'Unreachable - The destination account is unreachable.',
  F03: 'Invalid Amount - The amount format is invalid.',
  F04: 'Insufficient Destination Amount - The destination amount is too low.',
  F05: 'Wrong Condition - The fulfillment does not match the condition.',
  F06: 'Unexpected Payment - The receiver was not expecting a payment.',
  F07: 'Cannot Receive - The receiver cannot process the payment.',
  F08: 'Amount Too Large - The amount exceeds the maximum allowed.',
  F09: 'Invalid Peer Response - The peer returned an invalid response.',
  F99: 'Application Error - A final application-specific error occurred.',

  // Temporary errors
  T00: 'Internal Error - The connector encountered an internal error.',
  T01: 'Peer Unreachable - Could not connect to the peer.',
  T02: 'Peer Busy - The peer is processing too many requests.',
  T03: 'Connector Busy - The connector is overloaded.',
  T04: 'Insufficient Liquidity - Not enough funds available.',
  T05: 'Rate Limited - Too many requests in a short period.',
  T99: 'Application Error - A temporary application-specific error occurred.',

  // Relative errors
  R00: 'Transfer Timed Out - The payment expired before completing.',
  R01: 'Insufficient Source Amount - The source amount is too low.',
  R02: 'Insufficient Timeout - Not enough time to complete the payment.',
  R99: 'Application Error - A routing-related error occurred.',
};

/**
 * Error type classification
 */
export type ErrorType = 'final' | 'temporary' | 'relative';

/**
 * Get error type from code
 */
export function getErrorType(code: string): ErrorType {
  if (code.startsWith('F')) return 'final';
  if (code.startsWith('T')) return 'temporary';
  if (code.startsWith('R')) return 'relative';
  return 'final'; // Default to final for unknown
}

/**
 * Check if error is retryable
 */
export function isRetryable(code: string): boolean {
  const type = getErrorType(code);
  return type === 'temporary' || type === 'relative';
}

/**
 * Check if error is final
 */
export function isFinalError(code: string): boolean {
  return getErrorType(code) === 'final';
}

/**
 * Get error description
 */
export function getErrorDescription(code: string): string {
  return ERROR_DESCRIPTIONS[code] ?? `Unknown error code: ${code}`;
}

/**
 * Custom ILP Error class
 */
export class IlpError extends Error {
  code: string;
  triggeredBy: string;
  type: ErrorType;
  isRetryable: boolean;
  data?: Buffer;

  constructor(
    code: string,
    message: string,
    triggeredBy: string = '',
    data?: Buffer,
  ) {
    super(message);
    this.name = 'IlpError';
    this.code = code;
    this.triggeredBy = triggeredBy;
    this.type = getErrorType(code);
    this.isRetryable = isRetryable(code);
    this.data = data;
  }

  toReject(): {
    code: string;
    message: string;
    triggeredBy: string;
    data: Buffer;
  } {
    return {
      code: this.code,
      message: this.message,
      triggeredBy: this.triggeredBy,
      data: this.data ?? Buffer.alloc(0),
    };
  }
}

/**
 * Open Payments Error Codes
 */
export const OPEN_PAYMENTS_ERRORS = {
  /** Invalid client - client authentication failed */
  INVALID_CLIENT: 'invalid_client',
  /** Invalid grant - grant request failed */
  INVALID_GRANT: 'invalid_grant',
  /** Unauthorized client */
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  /** Unsupported grant type */
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  /** Invalid scope */
  INVALID_SCOPE: 'invalid_scope',
  /** Invalid request */
  INVALID_REQUEST: 'invalid_request',
  /** Access denied */
  ACCESS_DENIED: 'access_denied',
  /** Interaction required */
  INTERACTION_REQUIRED: 'interaction_required',
  /** Request denied */
  REQUEST_DENIED: 'request_denied',
  /** Unknown request */
  UNKNOWN_REQUEST: 'unknown_request',
} as const;

/**
 * HTTP Status codes for Open Payments
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
