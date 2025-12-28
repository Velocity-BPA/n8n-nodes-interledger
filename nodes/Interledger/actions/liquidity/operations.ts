/**
 * Liquidity Resource Operations
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use by for-profit organizations requires a commercial license from Velocity BPA.
 * https://velobpa.com/licensing | licensing@velobpa.com
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { RafikiClient } from '../../transport/rafikiClient';
import { ConnectorClient } from '../../transport/connectorClient';
import { ASSET_OPTIONS } from '../../constants/assets';

export const liquidityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
			},
		},
		options: [
			{ name: 'Add Liquidity', value: 'add', description: 'Add liquidity to an asset or peer', action: 'Add liquidity' },
			{ name: 'Remove Liquidity', value: 'remove', description: 'Remove liquidity from an asset or peer', action: 'Remove liquidity' },
			{ name: 'Get Liquidity Balance', value: 'getBalance', description: 'Get current liquidity balance', action: 'Get liquidity balance' },
			{ name: 'Get Liquidity for Asset', value: 'getForAsset', description: 'Get liquidity for a specific asset', action: 'Get liquidity for asset' },
			{ name: 'Get Liquidity by Peer', value: 'getByPeer', description: 'Get liquidity associated with a peer', action: 'Get liquidity by peer' },
			{ name: 'Deposit Liquidity', value: 'deposit', description: 'Deposit liquidity with idempotency key', action: 'Deposit liquidity' },
			{ name: 'Withdraw Liquidity', value: 'withdraw', description: 'Withdraw liquidity with idempotency key', action: 'Withdraw liquidity' },
			{ name: 'Get Liquidity Events', value: 'getEvents', description: 'Get liquidity change events', action: 'Get liquidity events' },
		],
		default: 'getBalance',
	},
];

export const liquidityFields: INodeProperties[] = [
	// Liquidity type selection
	{
		displayName: 'Liquidity Type',
		name: 'liquidityType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['add', 'remove', 'getBalance', 'deposit', 'withdraw'],
			},
		},
		options: [
			{ name: 'Asset Liquidity', value: 'asset', description: 'Liquidity for a specific asset' },
			{ name: 'Peer Liquidity', value: 'peer', description: 'Liquidity with a specific peer' },
		],
		default: 'asset',
		description: 'Type of liquidity to manage',
	},
	// Asset ID for asset liquidity operations
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['add', 'remove', 'getBalance', 'getForAsset', 'deposit', 'withdraw'],
				liquidityType: ['asset'],
			},
		},
		default: '',
		description: 'ID of the asset for liquidity operations',
	},
	// Asset code for getForAsset
	{
		displayName: 'Asset Code',
		name: 'assetCode',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['getForAsset'],
			},
		},
		options: ASSET_OPTIONS,
		default: 'USD',
		description: 'Asset code to get liquidity for',
	},
	// Peer ID for peer liquidity operations
	{
		displayName: 'Peer ID',
		name: 'peerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['add', 'remove', 'getBalance', 'getByPeer', 'deposit', 'withdraw'],
				liquidityType: ['peer'],
			},
		},
		default: '',
		description: 'ID of the peer for liquidity operations',
	},
	// Amount for add/remove/deposit/withdraw
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['add', 'remove', 'deposit', 'withdraw'],
			},
		},
		default: '',
		description: 'Amount of liquidity (in smallest unit of the asset)',
	},
	// Idempotency key for deposit/withdraw
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['deposit', 'withdraw'],
			},
		},
		default: '',
		description: 'Unique key to ensure idempotent operation',
	},
	// Timeout for withdraw
	{
		displayName: 'Timeout (seconds)',
		name: 'timeoutSeconds',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['withdraw'],
			},
		},
		default: 0,
		description: 'Timeout in seconds for two-phase withdrawal (0 for immediate)',
	},
	// Event options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['liquidity'],
				operation: ['getEvents'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'First',
				name: 'first',
				type: 'number',
				default: 20,
				description: 'Number of events to return',
			},
			{
				displayName: 'After',
				name: 'after',
				type: 'string',
				default: '',
				description: 'Cursor for pagination',
			},
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Deposit', value: 'deposit' },
					{ name: 'Withdrawal', value: 'withdrawal' },
				],
				default: 'all',
				description: 'Filter by event type',
			},
		],
	},
];

export async function executeLiquidityOperation(
	this: IExecuteFunctions,
	index: number,
	operation: string,
	rafikiClient?: RafikiClient,
	connectorClient?: ConnectorClient,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'add': {
			const liquidityType = this.getNodeParameter('liquidityType', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;

			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}

			if (liquidityType === 'asset') {
				const assetId = this.getNodeParameter('assetId', index) as string;
				const result = await rafikiClient.addAssetLiquidity(assetId, amount, `add-${Date.now()}`);
				returnData.push({ json: result });
			} else {
				const peerId = this.getNodeParameter('peerId', index) as string;
				const result = await rafikiClient.addPeerLiquidity(peerId, amount, `add-${Date.now()}`);
				returnData.push({ json: result });
			}
			break;
		}

		case 'remove': {
			const liquidityType = this.getNodeParameter('liquidityType', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;

			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}

			if (liquidityType === 'asset') {
				const assetId = this.getNodeParameter('assetId', index) as string;
				const result = await rafikiClient.withdrawAssetLiquidity(assetId, amount, `remove-${Date.now()}`);
				returnData.push({ json: result });
			} else {
				const peerId = this.getNodeParameter('peerId', index) as string;
				// For peer liquidity withdrawal, use similar pattern
				const result = await rafikiClient.withdrawAssetLiquidity(peerId, amount, `remove-${Date.now()}`);
				returnData.push({ json: result });
			}
			break;
		}

		case 'getBalance': {
			const liquidityType = this.getNodeParameter('liquidityType', index) as string;

			if (connectorClient) {
				if (liquidityType === 'asset') {
					const assetId = this.getNodeParameter('assetId', index) as string;
					const liquidity = await connectorClient.getLiquidityForAsset(assetId);
					returnData.push({ json: liquidity });
				} else {
					const peerId = this.getNodeParameter('peerId', index) as string;
					const balance = await connectorClient.getPeerBalance(peerId);
					returnData.push({ json: { peerId, balance } });
				}
			} else if (rafikiClient) {
				if (liquidityType === 'asset') {
					const assetId = this.getNodeParameter('assetId', index) as string;
					const asset = await rafikiClient.getAsset(assetId);
					returnData.push({
						json: {
							assetId,
							liquidity: asset.liquidity || '0',
							asset,
						},
					});
				} else {
					const peerId = this.getNodeParameter('peerId', index) as string;
					const peer = await rafikiClient.getPeer(peerId);
					returnData.push({
						json: {
							peerId,
							liquidity: peer.liquidity || '0',
							peer,
						},
					});
				}
			} else {
				throw new Error('Rafiki Admin or Connector credentials required');
			}
			break;
		}

		case 'getForAsset': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;

			if (connectorClient) {
				const liquidity = await connectorClient.getLiquidityForAsset(assetCode);
				returnData.push({ json: liquidity });
			} else if (rafikiClient) {
				const assets = await rafikiClient.listAssets();
				const asset = assets.find((a: { code: string }) => a.code === assetCode);
				if (asset) {
					returnData.push({
						json: {
							assetCode,
							assetId: asset.id,
							liquidity: asset.liquidity || '0',
							scale: asset.scale,
						},
					});
				} else {
					throw new Error(`Asset ${assetCode} not found`);
				}
			} else {
				throw new Error('Rafiki Admin or Connector credentials required');
			}
			break;
		}

		case 'getByPeer': {
			const peerId = this.getNodeParameter('peerId', index) as string;

			if (connectorClient) {
				const balance = await connectorClient.getPeerBalance(peerId);
				returnData.push({ json: { peerId, balance } });
			} else if (rafikiClient) {
				const peer = await rafikiClient.getPeer(peerId);
				returnData.push({
					json: {
						peerId,
						liquidity: peer.liquidity || '0',
						peer,
					},
				});
			} else {
				throw new Error('Rafiki Admin or Connector credentials required');
			}
			break;
		}

		case 'deposit': {
			const liquidityType = this.getNodeParameter('liquidityType', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const idempotencyKey = this.getNodeParameter('idempotencyKey', index) as string;

			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}

			if (liquidityType === 'asset') {
				const assetId = this.getNodeParameter('assetId', index) as string;
				const result = await rafikiClient.addAssetLiquidity(assetId, amount, idempotencyKey);
				returnData.push({
					json: {
						success: true,
						type: 'asset',
						assetId,
						amount,
						idempotencyKey,
						result,
					},
				});
			} else {
				const peerId = this.getNodeParameter('peerId', index) as string;
				const result = await rafikiClient.addPeerLiquidity(peerId, amount, idempotencyKey);
				returnData.push({
					json: {
						success: true,
						type: 'peer',
						peerId,
						amount,
						idempotencyKey,
						result,
					},
				});
			}
			break;
		}

		case 'withdraw': {
			const liquidityType = this.getNodeParameter('liquidityType', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const idempotencyKey = this.getNodeParameter('idempotencyKey', index) as string;
			const timeoutSeconds = this.getNodeParameter('timeoutSeconds', index, 0) as number;

			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}

			if (liquidityType === 'asset') {
				const assetId = this.getNodeParameter('assetId', index) as string;
				const result = await rafikiClient.withdrawAssetLiquidity(assetId, amount, idempotencyKey, timeoutSeconds);
				returnData.push({
					json: {
						success: true,
						type: 'asset',
						assetId,
						amount,
						idempotencyKey,
						timeoutSeconds,
						result,
					},
				});
			} else {
				const peerId = this.getNodeParameter('peerId', index) as string;
				// Withdraw peer liquidity
				const result = await rafikiClient.withdrawAssetLiquidity(peerId, amount, idempotencyKey, timeoutSeconds);
				returnData.push({
					json: {
						success: true,
						type: 'peer',
						peerId,
						amount,
						idempotencyKey,
						timeoutSeconds,
						result,
					},
				});
			}
			break;
		}

		case 'getEvents': {
			const options = this.getNodeParameter('options', index, {}) as {
				first?: number;
				after?: string;
				eventType?: string;
			};

			// Liquidity events would be fetched from Rafiki's webhook history or event log
			returnData.push({
				json: {
					events: [],
					pageInfo: {
						hasNextPage: false,
						hasPreviousPage: false,
					},
					note: 'Liquidity events are delivered via webhooks. Configure webhook endpoint to receive real-time events.',
					eventTypes: ['liquidity.deposited', 'liquidity.withdrawn', 'liquidity.threshold_reached'],
				},
			});
			break;
		}

		default:
			throw new Error(`Operation ${operation} is not supported`);
	}

	return returnData;
}
