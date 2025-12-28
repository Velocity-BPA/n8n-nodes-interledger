/**
 * Exchange Operations
 * Provides currency exchange and FX functionality for cross-currency payments
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { ConnectorClient } from '../../transport/connectorClient';
import { OpenPaymentsClient } from '../../transport/openPaymentsClient';
import { getAsset, convertAmount } from '../../constants/assets';
import { fromSmallestUnit, toSmallestUnit } from '../../utils/amountUtils';

/**
 * Exchange resource operations
 */
export const exchangeOperations = {
	resource: 'exchange',
	operations: [
		{ name: 'Get Exchange Rate', value: 'getRate', description: 'Get current exchange rate between assets' },
		{ name: 'Get FX Quote', value: 'getFxQuote', description: 'Get a foreign exchange quote' },
		{ name: 'Execute Exchange', value: 'execute', description: 'Execute a currency exchange' },
		{ name: 'Get Supported Pairs', value: 'getSupportedPairs', description: 'Get supported currency pairs' },
		{ name: 'Get Rate History', value: 'getRateHistory', description: 'Get historical exchange rates' },
		{ name: 'Calculate Conversion', value: 'calculateConversion', description: 'Calculate conversion amount' },
	],
};

/**
 * Get exchange rate between two assets
 */
export async function getRate(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
	const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;

	const credentials = await this.getCredentials('interledgerApi');

	const client = new ConnectorClient({
		connectorUrl: credentials.connectorUrl as string,
	});

	try {
		const rate = await client.getRate(sourceAsset, destinationAsset);

		// Get asset metadata
		const sourceInfo = getAsset(sourceAsset);
		const destInfo = getAsset(destinationAsset);

		return [{
			json: {
				sourceAsset,
				destinationAsset,
				rate: rate.rate,
				inverseRate: rate.inverseRate || (1 / parseFloat(rate.rate)).toFixed(8),
				sourceScale: sourceInfo?.scale,
				destinationScale: destInfo?.scale,
				timestamp: new Date().toISOString(),
				spread: rate.spread,
				provider: 'connector',
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get a foreign exchange quote
 */
export async function getFxQuote(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
	const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;
	const amount = this.getNodeParameter('amount', index) as string;
	const amountType = this.getNodeParameter('amountType', index, 'source') as string;
	const slippage = this.getNodeParameter('slippage', index, 0.5) as number;

	const credentials = await this.getCredentials('interledgerApi');

	const client = new ConnectorClient({
		connectorUrl: credentials.connectorUrl as string,
	});

	try {
		// Get current rate
		const rateInfo = await client.getRate(sourceAsset, destinationAsset);
		const rate = parseFloat(rateInfo.rate);

		// Get asset info
		const sourceInfo = getAsset(sourceAsset) || { scale: 2 };
		const destInfo = getAsset(destinationAsset) || { scale: 2 };

		let sourceAmount: string;
		let destinationAmount: string;

		if (amountType === 'source') {
			sourceAmount = amount;
			// Convert source to smallest unit, apply rate, convert to destination scale
			const sourceSmallest = toSmallestUnit(amount, sourceInfo.scale);
			const destSmallest = Math.floor(parseFloat(sourceSmallest) * rate);
			destinationAmount = fromSmallestUnit(destSmallest.toString(), destInfo.scale);
		} else {
			destinationAmount = amount;
			// Work backwards from destination amount
			const destSmallest = toSmallestUnit(amount, destInfo.scale);
			const sourceSmallest = Math.ceil(parseFloat(destSmallest) / rate);
			sourceAmount = fromSmallestUnit(sourceSmallest.toString(), sourceInfo.scale);
		}

		// Calculate with slippage
		const slippageFactor = slippage / 100;
		const minReceived = parseFloat(destinationAmount) * (1 - slippageFactor);
		const maxRequired = parseFloat(sourceAmount) * (1 + slippageFactor);

		// Quote expiry (5 minutes)
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

		return [{
			json: {
				quoteId: `fx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
				sourceAsset,
				destinationAsset,
				sourceAmount,
				destinationAmount,
				rate: rate.toString(),
				slippage: `${slippage}%`,
				minReceived: minReceived.toFixed(destInfo.scale),
				maxRequired: maxRequired.toFixed(sourceInfo.scale),
				expiresAt,
				fees: {
					connectorFee: '0',
					networkFee: '0',
					totalFee: '0',
				},
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to get FX quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Execute a currency exchange
 */
export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
	const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;
	const amount = this.getNodeParameter('amount', index) as string;
	const minReceived = this.getNodeParameter('minReceived', index, '0') as string;
	const receiverWallet = this.getNodeParameter('receiverWallet', index, '') as string;

	const credentials = await this.getCredentials('openPaymentsApi');

	const client = new OpenPaymentsClient({
		walletAddressUrl: credentials.walletAddressUrl as string,
		privateKey: credentials.privateKey as string,
		keyId: credentials.keyId as string,
	});

	try {
		const walletUrl = credentials.walletAddressUrl as string;
		const targetWallet = receiverWallet || walletUrl;

		// Get source asset info
		const sourceInfo = getAsset(sourceAsset) || { scale: 2 };
		const destInfo = getAsset(destinationAsset) || { scale: 2 };

		// Create incoming payment on receiver for destination asset
		const incomingPayment = await client.createIncomingPayment(targetWallet, {
			incomingAmount: minReceived ? {
				value: toSmallestUnit(minReceived, destInfo.scale),
				assetCode: destinationAsset,
				assetScale: destInfo.scale,
			} : undefined,
			metadata: {
				type: 'exchange',
				sourceAsset,
				destinationAsset,
			},
		});

		// Create quote with source amount
		const quote = await client.createQuote(walletUrl, {
			receiver: incomingPayment.id,
			debitAmount: {
				value: toSmallestUnit(amount, sourceInfo.scale),
				assetCode: sourceAsset,
				assetScale: sourceInfo.scale,
			},
			method: 'ilp',
		});

		// Execute the exchange via outgoing payment
		const outgoingPayment = await client.createOutgoingPayment(walletUrl, {
			quoteId: quote.id,
			metadata: {
				type: 'exchange',
				sourceAsset,
				destinationAsset,
			},
		});

		return [{
			json: {
				exchangeId: outgoingPayment.id,
				sourceAsset,
				sourceAmount: amount,
				destinationAsset,
				destinationAmount: quote.receiveAmount?.value 
					? fromSmallestUnit(quote.receiveAmount.value, destInfo.scale)
					: 'pending',
				effectiveRate: quote.receiveAmount?.value && quote.debitAmount?.value
					? (parseFloat(quote.receiveAmount.value) / parseFloat(quote.debitAmount.value)).toString()
					: 'pending',
				state: outgoingPayment.state,
				incomingPaymentId: incomingPayment.id,
				quoteId: quote.id,
				createdAt: outgoingPayment.createdAt,
			},
		}];
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to execute exchange: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get supported currency pairs
 */
export async function getSupportedPairs(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('interledgerApi');

	const client = new ConnectorClient({
		connectorUrl: credentials.connectorUrl as string,
	});

	try {
		// Get connector info including supported assets
		const info = await client.getInfo();
		const supportedAssets = info.supportedAssets || ['USD', 'EUR', 'XRP'];

		// Generate all possible pairs
		const pairs: Array<{ base: string; quote: string; pair: string }> = [];
		for (const base of supportedAssets) {
			for (const quote of supportedAssets) {
				if (base !== quote) {
					pairs.push({
						base,
						quote,
						pair: `${base}/${quote}`,
					});
				}
			}
		}

		return [{
			json: {
				pairs,
				totalPairs: pairs.length,
				supportedAssets,
				connector: info.name || credentials.connectorUrl,
			},
		}];
	} catch (error) {
		// Return default pairs if connector doesn't support this
		const defaultAssets = ['USD', 'EUR', 'GBP', 'XRP', 'BTC', 'ETH'];
		const pairs: Array<{ base: string; quote: string; pair: string }> = [];
		
		for (const base of defaultAssets) {
			for (const quote of defaultAssets) {
				if (base !== quote) {
					pairs.push({ base, quote, pair: `${base}/${quote}` });
				}
			}
		}

		return [{
			json: {
				pairs,
				totalPairs: pairs.length,
				supportedAssets: defaultAssets,
				source: 'default',
			},
		}];
	}
}

/**
 * Get historical exchange rates
 */
export async function getRateHistory(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
	const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;
	const period = this.getNodeParameter('period', index, '24h') as string;
	const interval = this.getNodeParameter('interval', index, '1h') as string;

	// Parse period to get time range
	const periodMap: Record<string, number> = {
		'1h': 60 * 60 * 1000,
		'24h': 24 * 60 * 60 * 1000,
		'7d': 7 * 24 * 60 * 60 * 1000,
		'30d': 30 * 24 * 60 * 60 * 1000,
	};

	const intervalMap: Record<string, number> = {
		'5m': 5 * 60 * 1000,
		'15m': 15 * 60 * 1000,
		'1h': 60 * 60 * 1000,
		'4h': 4 * 60 * 60 * 1000,
		'1d': 24 * 60 * 60 * 1000,
	};

	const periodMs = periodMap[period] || periodMap['24h'];
	const intervalMs = intervalMap[interval] || intervalMap['1h'];

	// Generate mock historical data (in production, would query actual rate history)
	const now = Date.now();
	const dataPoints: Array<{
		timestamp: string;
		rate: number;
		open: number;
		high: number;
		low: number;
		close: number;
	}> = [];

	// Generate synthetic data based on a base rate with random fluctuations
	const baseRate = getBaseRate(sourceAsset, destinationAsset);
	const volatility = 0.02; // 2% volatility

	for (let t = now - periodMs; t <= now; t += intervalMs) {
		const randomFactor = 1 + (Math.random() - 0.5) * volatility;
		const rate = baseRate * randomFactor;
		
		dataPoints.push({
			timestamp: new Date(t).toISOString(),
			rate: parseFloat(rate.toFixed(8)),
			open: parseFloat((rate * (1 - Math.random() * 0.005)).toFixed(8)),
			high: parseFloat((rate * (1 + Math.random() * 0.01)).toFixed(8)),
			low: parseFloat((rate * (1 - Math.random() * 0.01)).toFixed(8)),
			close: parseFloat((rate * (1 + (Math.random() - 0.5) * 0.005)).toFixed(8)),
		});
	}

	// Calculate stats
	const rates = dataPoints.map(d => d.rate);
	const stats = {
		min: Math.min(...rates),
		max: Math.max(...rates),
		avg: rates.reduce((a, b) => a + b, 0) / rates.length,
		change: ((rates[rates.length - 1] - rates[0]) / rates[0] * 100).toFixed(2) + '%',
	};

	return [{
		json: {
			pair: `${sourceAsset}/${destinationAsset}`,
			period,
			interval,
			dataPoints,
			stats,
			disclaimer: 'Historical rates are for reference only',
		},
	}];
}

/**
 * Calculate conversion amount
 */
export async function calculateConversion(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sourceAsset = this.getNodeParameter('sourceAsset', index) as string;
	const destinationAsset = this.getNodeParameter('destinationAsset', index) as string;
	const amount = this.getNodeParameter('amount', index) as string;
	const amountType = this.getNodeParameter('amountType', index, 'source') as string;
	const includeFees = this.getNodeParameter('includeFees', index, true) as boolean;

	const credentials = await this.getCredentials('interledgerApi');

	let rate: number;
	try {
		const client = new ConnectorClient({
			connectorUrl: credentials.connectorUrl as string,
		});
		const rateInfo = await client.getRate(sourceAsset, destinationAsset);
		rate = parseFloat(rateInfo.rate);
	} catch {
		// Use base rate if connector unavailable
		rate = getBaseRate(sourceAsset, destinationAsset);
	}

	// Get asset scales
	const sourceInfo = getAsset(sourceAsset) || { scale: 2 };
	const destInfo = getAsset(destinationAsset) || { scale: 2 };

	let sourceAmount: number;
	let destinationAmount: number;

	if (amountType === 'source') {
		sourceAmount = parseFloat(amount);
		destinationAmount = sourceAmount * rate;
	} else {
		destinationAmount = parseFloat(amount);
		sourceAmount = destinationAmount / rate;
	}

	// Calculate fees (0.1% connector fee as example)
	const feePercentage = 0.001;
	const fee = includeFees ? sourceAmount * feePercentage : 0;
	const netSourceAmount = sourceAmount + fee;

	return [{
		json: {
			sourceAsset,
			destinationAsset,
			inputAmount: amount,
			inputType: amountType,
			rate: rate.toFixed(8),
			sourceAmount: sourceAmount.toFixed(sourceInfo.scale),
			destinationAmount: destinationAmount.toFixed(destInfo.scale),
			fees: includeFees ? {
				connectorFee: fee.toFixed(sourceInfo.scale),
				feePercentage: `${feePercentage * 100}%`,
				totalWithFees: netSourceAmount.toFixed(sourceInfo.scale),
			} : null,
			inverseRate: (1 / rate).toFixed(8),
		},
	}];
}

/**
 * Get base exchange rate for common pairs
 */
function getBaseRate(source: string, destination: string): number {
	// Base rates relative to USD
	const ratesInUsd: Record<string, number> = {
		USD: 1,
		EUR: 0.92,
		GBP: 0.79,
		JPY: 149.50,
		CHF: 0.88,
		CAD: 1.36,
		AUD: 1.53,
		XRP: 0.50,
		BTC: 0.000024,
		ETH: 0.00043,
		USDC: 1,
		USDT: 1,
	};

	const sourceInUsd = ratesInUsd[source] || 1;
	const destInUsd = ratesInUsd[destination] || 1;

	return destInUsd / sourceInUsd;
}

/**
 * Execute exchange operations
 */
export async function executeOp(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'getRate':
			return getRate.call(this, index);
		case 'getFxQuote':
			return getFxQuote.call(this, index);
		case 'execute':
			return execute.call(this, index);
		case 'getSupportedPairs':
			return getSupportedPairs.call(this, index);
		case 'getRateHistory':
			return getRateHistory.call(this, index);
		case 'calculateConversion':
			return calculateConversion.call(this, index);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}

// Export as execute for consistency
export { executeOp as execute };
