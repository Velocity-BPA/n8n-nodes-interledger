/**
 * Rafiki Admin Resource Operations
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use by for-profit organizations requires a commercial license from Velocity BPA.
 * https://velobpa.com/licensing | licensing@velobpa.com
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { RafikiClient } from '../../transport/rafikiClient';
import { ASSET_OPTIONS } from '../../constants/assets';

export const rafikiAdminOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
			},
		},
		options: [
			{ name: 'Create Wallet Address', value: 'createWalletAddress', description: 'Create a new wallet address', action: 'Create wallet address' },
			{ name: 'Get Wallet Address', value: 'getWalletAddress', description: 'Get wallet address details', action: 'Get wallet address' },
			{ name: 'Update Wallet Address', value: 'updateWalletAddress', description: 'Update wallet address settings', action: 'Update wallet address' },
			{ name: 'Create Asset', value: 'createAsset', description: 'Create a new asset', action: 'Create asset' },
			{ name: 'Get Asset', value: 'getAsset', description: 'Get asset details', action: 'Get asset' },
			{ name: 'Create Peer', value: 'createPeer', description: 'Create a new peer connection', action: 'Create peer' },
			{ name: 'Get Peer', value: 'getPeer', description: 'Get peer details', action: 'Get peer' },
			{ name: 'Update Peer', value: 'updatePeer', description: 'Update peer settings', action: 'Update peer' },
			{ name: 'Delete Peer', value: 'deletePeer', description: 'Delete a peer connection', action: 'Delete peer' },
			{ name: 'Get Rafiki Health', value: 'getHealth', description: 'Get Rafiki server health status', action: 'Get rafiki health' },
			{ name: 'Get Rafiki Stats', value: 'getStats', description: 'Get Rafiki server statistics', action: 'Get rafiki stats' },
		],
		default: 'getHealth',
	},
];

export const rafikiAdminFields: INodeProperties[] = [
	// Wallet Address fields
	{
		displayName: 'Wallet Address URL',
		name: 'walletAddressUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createWalletAddress'],
			},
		},
		default: '',
		placeholder: 'https://wallet.example.com/alice',
		description: 'Full URL for the wallet address',
	},
	{
		displayName: 'Wallet Address ID',
		name: 'walletAddressId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['getWalletAddress', 'updateWalletAddress'],
			},
		},
		default: '',
		description: 'ID of the wallet address',
	},
	{
		displayName: 'Public Name',
		name: 'publicName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createWalletAddress', 'updateWalletAddress'],
			},
		},
		default: '',
		description: 'Public display name for the wallet',
	},
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createWalletAddress', 'getAsset'],
			},
		},
		default: '',
		description: 'ID of the asset for this wallet',
	},
	// Asset creation fields
	{
		displayName: 'Asset Code',
		name: 'assetCode',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createAsset'],
			},
		},
		options: ASSET_OPTIONS,
		default: 'USD',
		description: 'Currency code for the asset',
	},
	{
		displayName: 'Asset Scale',
		name: 'assetScale',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createAsset'],
			},
		},
		default: 2,
		description: 'Number of decimal places for the asset',
		typeOptions: {
			minValue: 0,
			maxValue: 18,
		},
	},
	// Peer fields
	{
		displayName: 'Peer ID',
		name: 'peerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['getPeer', 'updatePeer', 'deletePeer'],
			},
		},
		default: '',
		description: 'ID of the peer',
	},
	{
		displayName: 'Peer Static ILP Address',
		name: 'peerStaticIlpAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createPeer'],
			},
		},
		default: '',
		placeholder: 'g.example.peer',
		description: 'Static ILP address of the peer',
	},
	{
		displayName: 'Peer HTTP Endpoint',
		name: 'peerHttpEndpoint',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createPeer'],
			},
		},
		default: '',
		placeholder: 'https://peer.example.com/ilp',
		description: 'HTTP endpoint for ILP packets',
	},
	{
		displayName: 'Peer Asset ID',
		name: 'peerAssetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createPeer'],
			},
		},
		default: '',
		description: 'Asset ID for this peer connection',
	},
	{
		displayName: 'Peer Name',
		name: 'peerName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createPeer', 'updatePeer'],
			},
		},
		default: '',
		description: 'Friendly name for the peer',
	},
	// Update wallet address fields
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['updateWalletAddress'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				default: 'ACTIVE',
				description: 'Wallet address status',
			},
			{
				displayName: 'Public Name',
				name: 'publicName',
				type: 'string',
				default: '',
				description: 'Public display name',
			},
		],
	},
	// Update peer fields
	{
		displayName: 'Peer Update Fields',
		name: 'peerUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['updatePeer'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Packet Amount',
				name: 'maxPacketAmount',
				type: 'string',
				default: '',
				description: 'Maximum packet amount allowed',
			},
			{
				displayName: 'HTTP Endpoint',
				name: 'http',
				type: 'string',
				default: '',
				description: 'Updated HTTP endpoint',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Updated peer name',
			},
		],
	},
	// Wallet address additional options
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['rafikiAdmin'],
				operation: ['createWalletAddress'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Additional Properties',
				name: 'additionalProperties',
				type: 'json',
				default: '{}',
				description: 'Additional properties as JSON',
			},
		],
	},
];

export async function executeRafikiAdminOperation(
	this: IExecuteFunctions,
	index: number,
	operation: string,
	rafikiClient?: RafikiClient,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	if (!rafikiClient) {
		throw new Error('Rafiki Admin credentials are required for this resource');
	}

	switch (operation) {
		case 'createWalletAddress': {
			const walletAddressUrl = this.getNodeParameter('walletAddressUrl', index) as string;
			const assetId = this.getNodeParameter('assetId', index) as string;
			const publicName = this.getNodeParameter('publicName', index, '') as string;
			const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
				additionalProperties?: string;
			};

			let additionalProperties = {};
			if (additionalOptions.additionalProperties) {
				try {
					additionalProperties = JSON.parse(additionalOptions.additionalProperties);
				} catch {
					// Ignore parse errors
				}
			}

			const walletAddress = await rafikiClient.createWalletAddress({
				url: walletAddressUrl,
				assetId,
				publicName: publicName || undefined,
				additionalProperties,
			});
			returnData.push({ json: walletAddress });
			break;
		}

		case 'getWalletAddress': {
			const walletAddressId = this.getNodeParameter('walletAddressId', index) as string;
			const walletAddress = await rafikiClient.getWalletAddress(walletAddressId);
			returnData.push({ json: walletAddress });
			break;
		}

		case 'updateWalletAddress': {
			const walletAddressId = this.getNodeParameter('walletAddressId', index) as string;
			const publicName = this.getNodeParameter('publicName', index, '') as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as {
				status?: string;
				publicName?: string;
			};

			const updates: { status?: string; publicName?: string } = {};
			if (updateFields.status) updates.status = updateFields.status;
			if (updateFields.publicName || publicName) updates.publicName = updateFields.publicName || publicName;

			const walletAddress = await rafikiClient.updateWalletAddress(walletAddressId, updates);
			returnData.push({ json: walletAddress });
			break;
		}

		case 'createAsset': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const assetScale = this.getNodeParameter('assetScale', index) as number;
			const asset = await rafikiClient.createAsset(assetCode, assetScale);
			returnData.push({ json: asset });
			break;
		}

		case 'getAsset': {
			const assetId = this.getNodeParameter('assetId', index) as string;
			const asset = await rafikiClient.getAsset(assetId);
			returnData.push({ json: asset });
			break;
		}

		case 'createPeer': {
			const staticIlpAddress = this.getNodeParameter('peerStaticIlpAddress', index) as string;
			const http = this.getNodeParameter('peerHttpEndpoint', index) as string;
			const assetId = this.getNodeParameter('peerAssetId', index) as string;
			const name = this.getNodeParameter('peerName', index, '') as string;

			const peer = await rafikiClient.createPeer({
				staticIlpAddress,
				http: { incoming: { authTokens: [] }, outgoing: { endpoint: http, authToken: '' } },
				assetId,
				name: name || undefined,
			});
			returnData.push({ json: peer });
			break;
		}

		case 'getPeer': {
			const peerId = this.getNodeParameter('peerId', index) as string;
			const peer = await rafikiClient.getPeer(peerId);
			returnData.push({ json: peer });
			break;
		}

		case 'updatePeer': {
			const peerId = this.getNodeParameter('peerId', index) as string;
			const peerUpdateFields = this.getNodeParameter('peerUpdateFields', index, {}) as {
				maxPacketAmount?: string;
				http?: string;
				name?: string;
			};

			const peer = await rafikiClient.updatePeer(peerId, peerUpdateFields);
			returnData.push({ json: peer });
			break;
		}

		case 'deletePeer': {
			const peerId = this.getNodeParameter('peerId', index) as string;
			const result = await rafikiClient.deletePeer(peerId);
			returnData.push({
				json: {
					success: result,
					peerId,
					message: result ? 'Peer deleted successfully' : 'Failed to delete peer',
				},
			});
			break;
		}

		case 'getHealth': {
			const health = await rafikiClient.getHealth();
			returnData.push({ json: health });
			break;
		}

		case 'getStats': {
			const stats = await rafikiClient.getStats();
			returnData.push({ json: stats });
			break;
		}

		default:
			throw new Error(`Operation ${operation} is not supported`);
	}

	return returnData;
}
