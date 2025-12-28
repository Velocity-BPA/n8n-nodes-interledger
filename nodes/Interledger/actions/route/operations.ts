/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { ConnectorClient } from '../../transport/connectorClient';

/**
 * Route Operations
 *
 * Routes determine how payments are forwarded to their destinations.
 */

export async function addRoute(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const prefix = this.getNodeParameter('prefix', index) as string;
  const peer = this.getNodeParameter('peer', index) as string;
  const weight = this.getNodeParameter('weight', index, 100) as number;

  const route = await client.addRoute({
    prefix,
    peer,
    weight,
  });

  return [{ json: route as unknown as IDataObject }];
}

export async function getRoute(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const prefix = this.getNodeParameter('prefix', index) as string;
  const routes = await client.getRoutes();
  const route = routes.find(r => r.prefix === prefix);

  if (!route) {
    throw new Error(`Route not found for prefix: ${prefix}`);
  }

  return [{ json: route as unknown as IDataObject }];
}

export async function updateRoute(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const prefix = this.getNodeParameter('prefix', index) as string;
  const peer = this.getNodeParameter('peer', index) as string;
  const weight = this.getNodeParameter('weight', index, 100) as number;

  // Delete and recreate the route
  await client.deleteRoute(prefix);
  const route = await client.addRoute({
    prefix,
    peer,
    weight,
  });

  return [{ json: route as unknown as IDataObject }];
}

export async function deleteRoute(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const prefix = this.getNodeParameter('prefix', index) as string;
  await client.deleteRoute(prefix);

  return [{
    json: {
      success: true,
      prefix,
      deleted: true,
    } as IDataObject,
  }];
}

export async function listRoutes(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const routes = await client.getRoutes();
  return [{ json: { routes } as IDataObject }];
}

export async function getBestRoute(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const destination = this.getNodeParameter('destination', index) as string;
  const route = await client.getBestRoute(destination);

  if (!route) {
    return [{
      json: {
        destination,
        found: false,
        message: 'No route found for destination',
      } as IDataObject,
    }];
  }

  return [{
    json: {
      destination,
      found: true,
      ...route as unknown as IDataObject,
    },
  }];
}

export async function getRouteTable(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const routeTable = await client.getRouteTable();
  const routes = Array.from(routeTable.entries()).map(([prefix, route]) => ({
    prefix,
    ...route,
  }));

  return [{ json: { routes } as IDataObject }];
}

export async function configureRouting(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const routeBroadcastInterval = this.getNodeParameter('routeBroadcastInterval', index, 0) as number;
  const routeCleanupInterval = this.getNodeParameter('routeCleanupInterval', index, 0) as number;
  const routeExpiryDuration = this.getNodeParameter('routeExpiryDuration', index, 0) as number;
  const spreadProportion = this.getNodeParameter('spreadProportion', index, 0) as number;

  await client.configureRouting({
    routeBroadcastInterval: routeBroadcastInterval || undefined,
    routeCleanupInterval: routeCleanupInterval || undefined,
    routeExpiryDuration: routeExpiryDuration || undefined,
    spreadProportion: spreadProportion || undefined,
  });

  return [{
    json: {
      success: true,
      configured: true,
    } as IDataObject,
  }];
}

export async function getRouteCost(
  this: IExecuteFunctions,
  client: ConnectorClient,
  index: number,
): Promise<INodeExecutionData[]> {
  const destination = this.getNodeParameter('destination', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;

  const cost = await client.getRouteCost(destination, amount);

  return [{ json: cost as unknown as IDataObject }];
}

export const routeOperations = {
  add: addRoute,
  get: getRoute,
  update: updateRoute,
  delete: deleteRoute,
  list: listRoutes,
  getBest: getBestRoute,
  getTable: getRouteTable,
  configure: configureRouting,
  getCost: getRouteCost,
};
