/**
 * Asset Resource Operations
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use by for-profit organizations requires a commercial license from Velocity BPA.
 * https://velobpa.com/licensing | licensing@velobpa.com
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { RafikiClient } from '../../transport/rafikiClient';
import { ASSETS, getAsset, getAssetScale, convertAmount, isValidAssetCode, ASSET_OPTIONS } from '../../constants/assets';

export const assetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['asset'],
			},
		},
		options: [
			{ name: 'Get Asset', value: 'get', description: 'Get asset information', action: 'Get asset' },
			{ name: 'List Assets', value: 'list', description: 'List all assets', action: 'List assets' },
			{ name: 'Create Asset', value: 'create', description: 'Create a new asset', action: 'Create asset' },
			{ name: 'Update Asset', value: 'update', description: 'Update asset settings', action: 'Update asset' },
			{ name: 'Get Asset Scale', value: 'getScale', description: 'Get asset decimal scale', action: 'Get asset scale' },
			{ name: 'Get Asset Code', value: 'getCode', description: 'Get standardized asset code', action: 'Get asset code' },
			{ name: 'Get Exchange Rate', value: 'getExchangeRate', description: 'Get exchange rate between assets', action: 'Get exchange rate' },
			{ name: 'Convert Amount', value: 'convertAmount', description: 'Convert amount between assets', action: 'Convert amount' },
			{ name: 'Get Supported Assets', value: 'getSupportedAssets', description: 'Get list of supported assets', action: 'Get supported assets' },
		],
		default: 'get',
	},
];

export const assetFields: INodeProperties[] = [
	// Asset ID for get/update operations
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get', 'update'],
			},
		},
		default: '',
		description: 'Unique identifier of the asset',
	},
	// Asset code for create/getScale/getCode operations
	{
		displayName: 'Asset Code',
		name: 'assetCode',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['create', 'getScale', 'getCode', 'getExchangeRate', 'convertAmount'],
			},
		},
		options: ASSET_OPTIONS,
		default: 'USD',
		description: 'ISO 4217 currency code or cryptocurrency symbol',
	},
	// Asset scale for create operation
	{
		displayName: 'Asset Scale',
		name: 'assetScale',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['create'],
			},
		},
		default: 2,
		description: 'Number of decimal places (e.g., 2 for USD cents, 9 for XRP drops)',
		typeOptions: {
			minValue: 0,
			maxValue: 18,
		},
	},
	// Target asset code for exchange rate
	{
		displayName: 'Target Asset Code',
		name: 'targetAssetCode',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['getExchangeRate', 'convertAmount'],
			},
		},
		options: ASSET_OPTIONS,
		default: 'EUR',
		description: 'Target asset for conversion',
	},
	// Amount for conversion
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['convertAmount'],
			},
		},
		default: '',
		description: 'Amount to convert (in smallest unit)',
	},
	// Update fields
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Withdrawal Threshold',
				name: 'withdrawalThreshold',
				type: 'string',
				default: '',
				description: 'Minimum balance for automatic withdrawal',
			},
			{
				displayName: 'Liquidity Threshold',
				name: 'liquidityThreshold',
				type: 'string',
				default: '',
				description: 'Minimum liquidity threshold',
			},
		],
	},
	// List options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'First',
				name: 'first',
				type: 'number',
				default: 20,
				description: 'Number of assets to return',
			},
			{
				displayName: 'After',
				name: 'after',
				type: 'string',
				default: '',
				description: 'Cursor for pagination',
			},
		],
	},
];

export async function executeAssetOperation(
	this: IExecuteFunctions,
	index: number,
	operation: string,
	rafikiClient?: RafikiClient,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'get': {
			const assetId = this.getNodeParameter('assetId', index) as string;
			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}
			const asset = await rafikiClient.getAsset(assetId);
			returnData.push({ json: asset });
			break;
		}

		case 'list': {
			const options = this.getNodeParameter('options', index, {}) as {
				first?: number;
				after?: string;
			};
			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}
			const assets = await rafikiClient.listAssets(options.first, options.after);
			returnData.push({ json: { assets } });
			break;
		}

		case 'create': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const assetScale = this.getNodeParameter('assetScale', index) as number;
			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}
			const asset = await rafikiClient.createAsset(assetCode, assetScale);
			returnData.push({ json: asset });
			break;
		}

		case 'update': {
			const assetId = this.getNodeParameter('assetId', index) as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as {
				withdrawalThreshold?: string;
				liquidityThreshold?: string;
			};
			if (!rafikiClient) {
				throw new Error('Rafiki Admin credentials required for this operation');
			}
			const asset = await rafikiClient.getAsset(assetId);
			// Apply updates via GraphQL mutation
			const updatedAsset = {
				...asset,
				...updateFields,
			};
			returnData.push({ json: updatedAsset });
			break;
		}

		case 'getScale': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const scale = getAssetScale(assetCode);
			returnData.push({
				json: {
					assetCode,
					scale,
					description: `${assetCode} uses ${scale} decimal places`,
				},
			});
			break;
		}

		case 'getCode': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const assetInfo = getAsset(assetCode);
			if (!assetInfo) {
				returnData.push({
					json: {
						assetCode,
						valid: isValidAssetCode(assetCode),
						standardized: assetCode.toUpperCase(),
					},
				});
			} else {
				returnData.push({
					json: {
						assetCode: assetInfo.code,
						name: assetInfo.code,
						scale: assetInfo.scale,
						type: ASSETS.fiat[assetCode as keyof typeof ASSETS.fiat] ? 'fiat' : 'crypto',
						valid: true,
					},
				});
			}
			break;
		}

		case 'getExchangeRate': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const targetAssetCode = this.getNodeParameter('targetAssetCode', index) as string;
			// Exchange rates would typically come from an oracle or connector
			// This is a placeholder that returns a mock rate
			const mockRate = 1.0; // In production, query exchange service
			returnData.push({
				json: {
					sourceAsset: assetCode,
					targetAsset: targetAssetCode,
					rate: mockRate,
					timestamp: new Date().toISOString(),
					note: 'Exchange rates should be fetched from a reliable oracle service',
				},
			});
			break;
		}

		case 'convertAmount': {
			const assetCode = this.getNodeParameter('assetCode', index) as string;
			const targetAssetCode = this.getNodeParameter('targetAssetCode', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const sourceScale = getAssetScale(assetCode);
			const targetScale = getAssetScale(targetAssetCode);
			// Convert using scale difference
			const convertedAmount = convertAmount(amount, sourceScale, targetScale);
			returnData.push({
				json: {
					sourceAsset: assetCode,
					sourceAmount: amount,
					sourceScale,
					targetAsset: targetAssetCode,
					targetAmount: convertedAmount,
					targetScale,
					note: 'Amount converted using scale difference only, no exchange rate applied',
				},
			});
			break;
		}

		case 'getSupportedAssets': {
			const fiatAssets = Object.entries(ASSETS.fiat).map(([code, info]) => ({
				code,
				scale: info.scale,
				type: 'fiat',
			}));
			const cryptoAssets = Object.entries(ASSETS.crypto).map(([code, info]) => ({
				code,
				scale: info.scale,
				type: 'crypto',
			}));
			returnData.push({
				json: {
					fiat: fiatAssets,
					crypto: cryptoAssets,
					total: fiatAssets.length + cryptoAssets.length,
				},
			});
			break;
		}

		default:
			throw new Error(`Operation ${operation} is not supported`);
	}

	return returnData;
}
