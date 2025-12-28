# n8n-nodes-interledger

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for the Interledger Protocol (ILP), providing 21 resources and 150+ operations for Open Payments, STREAM protocol, SPSP, Rafiki integration, Web Monetization, connectors, and cross-currency payments.

![n8n version](https://img.shields.io/badge/n8n-%3E%3D1.0.0-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)

## Features

- **Open Payments API**: Full support for wallet addresses, incoming/outgoing payments, quotes, and grants
- **STREAM Protocol**: Streaming payments with money and data streams
- **SPSP (Simple Payment Setup Protocol)**: Payment pointer resolution and SPSP payments
- **Rafiki Integration**: Admin API for Rafiki open-source implementation
- **Web Monetization**: Monetization links, payment streams, and receipt verification
- **ILP Packet Handling**: Create, parse, serialize, and validate ILP packets
- **Connector Operations**: Manage peers, routes, accounts, and liquidity
- **Cross-Currency Payments**: Exchange rates, FX quotes, and multi-asset support
- **HTTP Signatures**: Ed25519 request signing per Open Payments specification
- **Trigger Node**: Real-time webhooks for 30+ event types

## Installation

### Community Nodes (Recommended)

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-interledger`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the package
npm install n8n-nodes-interledger
```

### Development Installation

```bash
# Clone or extract the package
cd n8n-nodes-interledger

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-interledger

# Restart n8n
n8n start
```

## Credentials Setup

### Interledger Credentials

Multi-purpose credentials for ILP operations.

| Field | Description | Required |
|-------|-------------|----------|
| Configuration Type | Rafiki, Connector, STREAM, or Custom | Yes |
| Wallet Address | Payment pointer (e.g., $wallet.example.com/alice) | Yes |
| Private Key | Ed25519 private key (base64) | Yes |
| Public Key | Ed25519 public key (base64) | Yes |
| Key ID | Unique key identifier URL | Yes |
| ILP Address | Your ILP address (for connector mode) | No |
| Asset Code | Currency code (USD, EUR, XRP, etc.) | No |
| Asset Scale | Decimal places for amounts | No |
| Shared Secret | Base64 shared secret for STREAM | No |

### Open Payments Credentials

For Open Payments API operations.

| Field | Description | Required |
|-------|-------------|----------|
| Wallet Address URL | Full URL of wallet address | Yes |
| Client Private Key | Ed25519 private key for signing | Yes |
| Client Public Key | Ed25519 public key | Yes |
| Key ID | Key identifier for HTTP signatures | Yes |
| Authorization Server URL | GNAP auth server URL | No |
| Incoming Payment Token | Pre-authorized access token | No |
| Outgoing Payment Token | Pre-authorized access token | No |

### Rafiki Admin Credentials

For Rafiki administrative operations.

| Field | Description | Required |
|-------|-------------|----------|
| Admin URL | Rafiki Admin API URL | Yes |
| API Key | Admin API authentication key | No |
| Auth Method | None, API Key, or Bearer Token | Yes |

### SPSP Credentials

For Simple Payment Setup Protocol operations.

| Field | Description | Required |
|-------|-------------|----------|
| Payment Pointer | Receiver payment pointer | Yes |
| Receiver Endpoint | SPSP endpoint URL | No |
| Shared Secret | Shared secret for STREAM setup | No |

## Resources & Operations

### Wallet Address
- Get Wallet Address, Get Keys, Create, Update
- Get by URL, Resolve Payment Pointer
- Get Supported Assets, Get Balance

### Incoming Payment
- Create, Get, List, Complete
- Get by URL, Get Received Amount
- Get Expiration, Cancel

### Outgoing Payment
- Create, Get, List, Get by URL
- Get Sent Amount, Get Failed Amount
- Cancel, Get Quote

### Quote
- Create, Get, Get by ID
- Get Expiration, Calculate Exchange Rate
- Get Fee Estimate, Get Path Payment Quote

### Grant
- Request, Get, Continue, Cancel
- Revoke, Get Status, List
- Get Access Token

### Payment Pointer
- Resolve, Get Metadata, Validate
- Get SPSP Endpoint, Get Receiver Info

### STREAM
- Create Connection, Send Payment, Receive Payment
- Get Connection ID, Get Shared Secret
- Close Connection, Get State
- Get Money Received/Sent

### SPSP
- Query Endpoint, Send Payment
- Get Response, Get Destination Details
- Get Shared Secret, Get Destination Account

### ILP Packet
- Create Prepare/Fulfill/Reject Packets
- Parse, Validate, Get Type, Get Data
- Serialize, Deserialize

### Connector
- Get Info, Get Routes, Get Peers
- Add/Remove Peer, Get/Add/Remove Liquidity
- Get Balance, Get Rate, Get Supported Protocols

### Account
- Create, Get, Update, Delete, List
- Get Balance, Get Settings
- Send To, Receive From

### Peer
- Add, Get, Update, Remove, List
- Get Status, Get Balance
- Configure, Test Connection

### Route
- Add, Get, Update, Delete, List
- Get Best Route, Get Route Table
- Configure Routing, Get Cost

### Asset
- Get, List, Create, Update
- Get Scale, Get Code, Get Exchange Rate
- Convert Amount, Get Supported Assets

### Liquidity
- Add, Remove, Get Balance
- Get for Asset, Get by Peer
- Deposit, Withdraw, Get Events

### Rafiki Admin
- Create/Get/Update Wallet Address
- Create/Get Asset
- Create/Get/Update/Delete Peer
- Get Health, Get Stats

### Web Monetization
- Create Link, Verify, Get Status
- Get Payment Stream, Get Receipt
- Verify Receipt, Get WMRI

### Payment (High-Level)
- Send, Receive, Get, List
- Get Status, Cancel, Retry
- Get Proof

### Exchange
- Get Rate, Get FX Quote, Execute
- Get Supported Pairs, Get Rate History
- Calculate Conversion

### Webhook
- Create, Get, Update, Delete, List
- Get Events, Verify Signature

### Utility
- Validate/Parse Payment Pointer
- Format/Validate ILP Address
- Convert Amount, Generate Key Pair
- Sign/Verify Data, Get Protocol Version

## Trigger Node

The **Interledger Trigger** node monitors events via webhooks:

**Incoming Payment Events**: Created, Completed, Expired, Received, Partial

**Outgoing Payment Events**: Created, Completed, Failed, Sent, Cancelled

**Quote Events**: Created, Expired, Accepted

**Grant Events**: Requested, Approved, Denied, Revoked

**STREAM Events**: Connection Opened/Closed, Money Received/Sent, Error

**Connector Events**: Peer Connected/Disconnected, Route Added/Removed, Liquidity/Balance Changed

**Wallet Events**: Created, Updated, Balance Changed

**Web Monetization Events**: Started, Stopped, Payment Stream, Receipt Verified

## Usage Examples

### Sending a Payment via Open Payments

```javascript
// 1. Create an outgoing payment
{
  "resource": "outgoingPayment",
  "operation": "create",
  "walletAddressUrl": "https://wallet.example.com/alice",
  "quoteId": "https://wallet.example.com/quotes/abc123",
  "metadata": {
    "description": "Payment for services"
  }
}
```

### Receiving Payments with Incoming Payment

```javascript
// 1. Create an incoming payment
{
  "resource": "incomingPayment",
  "operation": "create",
  "walletAddressUrl": "https://wallet.example.com/alice",
  "incomingAmount": {
    "value": "1000",
    "assetCode": "USD",
    "assetScale": 2
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### SPSP Payment

```javascript
// 1. Query SPSP endpoint
{
  "resource": "spsp",
  "operation": "queryEndpoint",
  "paymentPointer": "$wallet.example.com/alice"
}

// 2. Send payment
{
  "resource": "spsp",
  "operation": "sendPayment",
  "paymentPointer": "$wallet.example.com/alice",
  "amount": "500",
  "assetCode": "USD",
  "assetScale": 2
}
```

### STREAM Protocol Payment

```javascript
// 1. Create STREAM connection
{
  "resource": "stream",
  "operation": "createConnection",
  "destinationAccount": "g.example.alice",
  "sharedSecret": "base64-shared-secret"
}

// 2. Send money via STREAM
{
  "resource": "stream",
  "operation": "sendPayment",
  "amount": "10000",
  "connectionId": "conn-123"
}
```

### Web Monetization Integration

```javascript
// 1. Create monetization link
{
  "resource": "webMonetization",
  "operation": "createLink",
  "paymentPointer": "$wallet.example.com/creator",
  "rel": "monetization"
}

// 2. Verify receipt
{
  "resource": "webMonetization",
  "operation": "verifyReceipt",
  "receipt": "base64-encoded-receipt"
}
```

### Connector Operations

```javascript
// 1. Get connector info
{
  "resource": "connector",
  "operation": "getInfo"
}

// 2. Add peer
{
  "resource": "peer",
  "operation": "add",
  "ilpAddress": "g.peer.example",
  "endpoint": "http://peer.example.com/ilp",
  "authToken": "peer-auth-token"
}

// 3. Add liquidity
{
  "resource": "liquidity",
  "operation": "add",
  "assetCode": "USD",
  "amount": "100000"
}
```

### Grant Management

```javascript
// 1. Request a grant
{
  "resource": "grant",
  "operation": "request",
  "walletAddressUrl": "https://wallet.example.com/alice",
  "accessType": "outgoing-payment",
  "actions": ["create", "read"],
  "limits": {
    "debitAmount": {
      "value": "10000",
      "assetCode": "USD",
      "assetScale": 2
    }
  }
}

// 2. Continue interactive grant
{
  "resource": "grant",
  "operation": "continue",
  "continueUri": "https://auth.example.com/continue/abc",
  "continueToken": "continue-token-xyz"
}
```

### Cross-Currency Payment

```javascript
// 1. Get exchange rate
{
  "resource": "exchange",
  "operation": "getRate",
  "sourceAsset": "USD",
  "destinationAsset": "EUR"
}

// 2. Create cross-currency quote
{
  "resource": "quote",
  "operation": "create",
  "walletAddressUrl": "https://wallet.example.com/alice",
  "receiver": "https://wallet.eu.example.com/bob",
  "debitAmount": {
    "value": "1000",
    "assetCode": "USD",
    "assetScale": 2
  }
}
```

### Rafiki Admin Operations

```javascript
// 1. Create asset
{
  "resource": "rafikiAdmin",
  "operation": "createAsset",
  "code": "USD",
  "scale": 2
}

// 2. Create wallet address
{
  "resource": "rafikiAdmin",
  "operation": "createWalletAddress",
  "url": "https://wallet.example.com/alice",
  "publicName": "Alice's Wallet",
  "assetId": "asset-uuid-here"
}
```

### Payment Verification

```javascript
// 1. Get payment proof
{
  "resource": "payment",
  "operation": "getProof",
  "paymentId": "payment-uuid"
}

// 2. Verify webhook signature
{
  "resource": "webhook",
  "operation": "verifySignature",
  "payload": "webhook-body",
  "signature": "signature-header",
  "secret": "webhook-secret"
}
```

## Interledger Protocol Concepts

### ILP Address
A hierarchical identifier for accounts on the Interledger network.
- Format: `allocation.connector.account`
- Example: `g.rafiki.alice` (global allocation, rafiki connector, alice account)
- Allocations: `g.` (global), `test.` (testnet), `private.` (private networks)

### Payment Pointer
Human-readable identifier that resolves to a wallet address.
- Format: `$host/path`
- Example: `$wallet.example.com/alice`
- Resolves to: `https://wallet.example.com/.well-known/pay/alice`

### Asset Scale
The number of decimal places for an asset's smallest unit.
- USD: scale 2 (cents) - 100 = $1.00
- XRP: scale 6 - 1000000 = 1 XRP
- BTC: scale 8 (satoshis) - 100000000 = 1 BTC

### STREAM Protocol
Multiplexed transport protocol for streaming payments over ILP.
- Supports money streams (payments) and data streams
- Uses encryption (AES-256-GCM) for privacy
- Provides reliable delivery with packet framing

### SPSP (Simple Payment Setup Protocol)
Protocol for setting up payments using payment pointers.
- Query endpoint returns destination account and shared secret
- Used to initiate STREAM connections

### Open Payments
REST API standard for interacting with ILP wallets.
- Wallet Addresses: Account identifiers
- Incoming Payments: Receive funds
- Outgoing Payments: Send funds
- Quotes: Cost estimates for payments
- Grants: Authorization via GNAP

### Condition/Fulfillment
Cryptographic mechanism ensuring atomic payments.
- Condition: SHA-256 hash of fulfillment (32 bytes)
- Fulfillment: Pre-image that satisfies condition
- Ensures payment only completes if condition is met

### ILP Packet Types
- **Prepare**: Initiates a payment with amount, expiry, condition
- **Fulfill**: Completes payment with fulfillment proof
- **Reject**: Declines payment with error code and message

## Networks

| Network | Prefix | Description |
|---------|--------|-------------|
| Global | `g.` | Main production network |
| Test | `test.` | Public testnet for development |
| Private | `private.` | Private/internal networks |
| Local | `local.` | Local development |
| Example | `example.` | Documentation examples |
| Peer | `peer.` | Peer-specific addresses |
| Self | `self.` | Local connector |

## Error Handling

The node provides structured error handling with ILP-specific error codes:

**Final Errors** (F00-F99): Unrecoverable
- F00: Bad Request
- F01: Invalid Packet
- F02: Unreachable
- F03: Invalid Amount
- F04: Insufficient Destination Amount
- F05: Wrong Condition
- F06: Unexpected Payment
- F07: Cannot Receive
- F08: Amount Too Large
- F99: Application Error

**Temporary Errors** (T00-T99): Retryable
- T00: Internal Error
- T01: Peer Unreachable
- T02: Peer Busy
- T03: Connector Busy
- T04: Insufficient Liquidity
- T99: Application Error

**Relative Errors** (R00-R99): Path-specific
- R00: Transfer Timed Out
- R01: Insufficient Source Amount
- R02: Insufficient Timeout
- R99: Application Error

## Security Best Practices

1. **Protect Private Keys**: Never expose Ed25519 private keys in logs or responses
2. **Verify Signatures**: Always verify HTTP signatures on incoming requests
3. **Validate Payment Pointers**: Ensure payment pointers resolve to legitimate endpoints
4. **Check Grant Permissions**: Verify grants have appropriate access rights
5. **Verify Fulfillments**: Always validate fulfillments against conditions
6. **Secure Shared Secrets**: Treat STREAM shared secrets as sensitive
7. **Use HTTPS**: Always use TLS for ILP communications
8. **Verify Webhook Signatures**: Authenticate incoming webhook events
9. **Handle Rate Limits**: Implement backoff for rate-limited requests
10. **Validate Amounts**: Check amounts against expected scales and limits

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Watch mode for development
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing style (run `npm run lint`)
2. Tests pass (`npm test`)
3. Add tests for new functionality
4. Update documentation as needed

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-interledger/issues)
- **Documentation**: [Interledger.org](https://interledger.org)
- **Open Payments Spec**: [openpayments.guide](https://openpayments.guide)
- **Rafiki**: [github.com/interledger/rafiki](https://github.com/interledger/rafiki)

## Acknowledgments

- [Interledger Foundation](https://interledger.org) for the ILP specification
- [Open Payments](https://openpayments.guide) for the REST API standard
- [Rafiki](https://github.com/interledger/rafiki) for the open-source implementation
- [n8n](https://n8n.io) for the workflow automation platform
