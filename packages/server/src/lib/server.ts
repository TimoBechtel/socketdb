import {
	BatchedUpdate,
	DATA_CONTEXT,
	DataEvents,
	Json,
	KeepAliveEvents,
	Node,
	NormalizedPath,
	Plugin,
	SOCKET_EVENTS,
	SocketServer,
	Store,
	createBatchedClient,
	createStore,
	createUpdateBatcher,
	deepClone,
	isObject,
	joinPath,
	nodeify,
	normalizePath,
	parsePath,
	traverseNode,
} from '@socketdb/core';
import { Hook, createHooks } from 'krog';
import { createBatchedInterval } from './batchedInterval';
import { createWebsocketServer } from './socket-implementation/websocketServer';
import { RecursivePartial } from './utils';

// can be overwritten by consumers
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SessionContext extends Record<string, unknown> {}

type RootSchemaDefinition = Json;

type Subscriptions = {
	[id: string]: { [path: string]: (data: BatchedUpdate) => void };
};

export type SocketDBServerDataAPI<Schema extends RootSchemaDefinition> = {
	update: (data: Node<RecursivePartial<Schema>>) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
};

export type SocketDBServerAPI<Schema extends RootSchemaDefinition> =
	SocketDBServerDataAPI<Schema> & {
		listen: (port?: number, callback?: () => void) => void;
		intercept: <Hook extends keyof ServerHooks<Schema>>(
			hook: Hook,
			callback: ServerHooks<Schema>[Hook]
		) => () => void;
	};

export type ServerHooks<Schema extends RootSchemaDefinition> = {
	'server:clientConnect'?: Hook<
		{ id: string },
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	/**
	 * Allows you to intercept the keep-alive check for a client.
	 *
	 * Throwing an error will skip the check and disconnect the client.
	 *
	 * Returned arguments will be sent to the client as a payload.
	 *
	 */
	'server:keepAliveCheck'?: Hook<
		Record<string, unknown>,
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	/**
	 * Allows you to verify the pong (heartbeat) response from the client.
	 *
	 * If you throw an error, the client will be disconnected. Otherwise, the client will be considered connected.
	 *
	 * You can use this to add additional checks, e.g. verify the client token expiration.
	 *
	 * Any payload sent by the client will be passed as arguments.
	 */
	'server:heartbeat'?: Hook<
		Record<string, unknown>,
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:clientDisconnect'?: Hook<
		{ id: string },
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:update'?: Hook<
		{ data: Node<RecursivePartial<Schema>> },
		// if client id is null, it means the update comes from the server
		// TODO: allow client object to be null, when update comes from server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:delete'?: Hook<
		{ path: string },
		// if client id is null, it means the deletion comes from the server
		// TODO: allow client object to be null, when update comes from server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
};

export type ServerPlugin<
	Schema extends RootSchemaDefinition = RootSchemaDefinition
> = Plugin<ServerHooks<Schema>>;

export function SocketDBServer<Schema extends RootSchemaDefinition>({
	store = createStore(),
	updateInterval = 50,
	socketServer = createWebsocketServer(),
	plugins = [],
	keepAliveInterval = 30_000,
}: {
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin<Schema>[];
	/**
	 * Interval in milliseconds between keep alive pings.
	 * @default 30000
	 *
	 * Set to 0 to disable keep alive.
	 */
	keepAliveInterval?: number;
} = {}): SocketDBServerAPI<Schema> {
	// use half of the update interval, because we have two update queues resulting in double the time
	updateInterval = updateInterval / 2;

	const subscriber: Subscriptions = {};

	const queue = createUpdateBatcher(notifySubscribers, updateInterval);

	const api: SocketDBServerDataAPI<Schema> = {
		update,
		get: (path: string): Node => {
			const data = store.get(path);
			if (!data) return nodeify(null);
			return deepClone(data);
		},
		delete: del,
	};

	const hooks = createHooks<ServerHooks<Schema>>();
	registerPlugins(plugins);

	function registerPlugins(plugins: ServerPlugin<Schema>[]) {
		plugins.forEach((plugin) => {
			Object.entries(plugin.hooks).forEach(
				([name, hook]: [
					string,
					ServerHooks<Schema>[keyof ServerHooks<Schema>]
				]) => {
					hooks.register(name as keyof ServerHooks<Schema>, hook);
				}
			);
		});
	}

	function update(
		data: Node,
		client: { id: string | null; context: SessionContext | null } = {
			id: null,
			context: null,
		}
	) {
		hooks
			.call('server:update', {
				args: { data },
				context: {
					client,
					api,
				},
			})
			.then(({ data }) => {
				const diff = store.put(data);
				queue({ type: 'change', data: diff });
			})
			.catch(console.warn);
	}

	function del(
		path: string,
		client: { id: string | null; context: SessionContext | null } = {
			id: null,
			context: null,
		}
	) {
		hooks
			.call(
				'server:delete',
				{ args: { path }, context: { client, api } },
				{ asRef: true }
			)
			.then(({ path }) => {
				const normalizedPath = normalizePath(path);
				store.del(normalizedPath);
				queue({ type: 'delete', path: normalizedPath });
			})
			.catch(console.warn);
	}

	function notifySubscribers(diff: BatchedUpdate) {
		if (!diff.change && !diff.delete) return;
		Object.values(subscriber).forEach((subscription) => {
			Object.entries(subscription).forEach(([subscribedPath, callback]) => {
				const update: BatchedUpdate = {};
				const deletePaths =
					diff.delete?.filter(
						(path) =>
							path.startsWith(subscribedPath) || subscribedPath.startsWith(path)
					) || [];
				if (deletePaths && deletePaths.length > 0) update.delete = deletePaths;
				if (diff.change) {
					traverseNode(diff.change, (path, data) => {
						if (subscribedPath === path) {
							update.change = data;
							return true;
						}
						return;
					});
				}
				if (update.change || update.delete) callback(update);
			});
		});
	}

	function addSubscriber(
		id: string,
		path: NormalizedPath,
		callback: (diff: BatchedUpdate) => void
	) {
		if (!subscriber[id]) subscriber[id] = {};
		subscriber[id][path] = callback;
	}

	function removeSubscriber(id: string, path: NormalizedPath) {
		if (subscriber[id]) {
			delete subscriber[id][path];
		}
	}

	const shouldDoKeepAlive =
		keepAliveInterval > 0 && keepAliveInterval !== Infinity;
	const keepAliveChecks = shouldDoKeepAlive
		? createBatchedInterval({
				interval: keepAliveInterval,
		  })
		: null;

	socketServer.onConnection((connection, id, context = {}) => {
		const clientContext = { id, context };
		const socketEvents = createBatchedClient<KeepAliveEvents & DataEvents>(
			connection,
			updateInterval
		);
		hooks.call(
			'server:clientConnect',
			{
				args: { id },
				context: { client: clientContext, api },
			},
			{ asRef: true }
		);

		let alive = true;
		const disableKeepAliveChecks =
			keepAliveChecks?.add(() => {
				if (!alive) {
					connection.close();
					return;
				}
				alive = false;
				hooks
					.call('server:keepAliveCheck', {
						args: {},
						context: { client: clientContext, api },
					})
					.then((payload) => {
						socketEvents.queue(SOCKET_EVENTS.keepAlive.ping, payload);
					})
					.catch(() => {
						connection.close();
					});
			}) || null;
		if (shouldDoKeepAlive) {
			socketEvents.subscribe(SOCKET_EVENTS.keepAlive.pong, (payload) => {
				hooks
					.call('server:heartbeat', {
						args: payload,
						context: { client: clientContext, api },
					})
					.then(() => {
						alive = true;
					})
					// if a error is thrown in the pong hook, alive stays at false
					// and the client will be disconnected after the next keep alive check
					.catch(console.warn);
			});
		}

		connection.onDisconnect(() => {
			disableKeepAliveChecks?.();
			delete subscriber[id];
			delete subscriber[id + 'wildcard']; // this should be handled in a cleaner way
			hooks.call(
				'server:clientDisconnect',
				{ args: { id }, context: { client: clientContext, api } },
				{ asRef: true }
			);
		});
		socketEvents.subscribe(
			SOCKET_EVENTS.data.clientUpdate,
			({ data }: { data: BatchedUpdate }) => {
				data.delete?.forEach((path) => del(path, clientContext));
				if (data.change) update(data.change, clientContext);
			}
		);
		socketEvents.subscribe(
			SOCKET_EVENTS.data.requestSubscription,
			({ path: requestedPath, once }) => {
				const path = normalizePath(requestedPath);
				const storedData = store.get(path);
				socketEvents.queue(`${DATA_CONTEXT}:${path}`, {
					data: {
						// deepClone to only send the current snapshot, as data might change while queued
						change: storedData ? deepClone(storedData) : nodeify(null),
					},
				});
				if (once) return;
				addSubscriber(id, path, (data) => {
					socketEvents.queue(`${DATA_CONTEXT}:${path}`, { data });
				});
			}
		);
		socketEvents.subscribe(
			SOCKET_EVENTS.data.requestUnsubscription,
			({ path: requestedPath }) => {
				removeSubscriber(id, normalizePath(requestedPath));
			}
		);
		socketEvents.subscribe(
			SOCKET_EVENTS.data.requestKeysSubscription,
			({ path: requestedPath }) => {
				const path = normalizePath(requestedPath);
				const storedData = store.get(path);
				const wildcardPath = joinPath(path, '*');
				let handledKeys: string[] = [];
				const value = storedData?.value;
				if (isObject(value)) {
					handledKeys = Object.keys(value);
					socketEvents.queue(`${DATA_CONTEXT}:${wildcardPath}`, {
						// destructure keys to only send the current keys, as they might change while queued
						data: { added: [...handledKeys] },
					});
				}
				addSubscriber(id + 'wildcard', path, (data: BatchedUpdate) => {
					if (data.change && isObject(data.change.value)) {
						const receivedKeys = Object.keys(data.change.value);

						const unhandledKeys = receivedKeys.filter(
							(key) => !handledKeys.includes(key)
						);
						if (unhandledKeys.length > 0)
							socketEvents.queue(`${DATA_CONTEXT}:${wildcardPath}`, {
								data: {
									added: unhandledKeys,
								},
							});
						// add new keys
						handledKeys = [...handledKeys, ...unhandledKeys];
					}
					if (data.delete) {
						// note: deletions are absolute paths
						// they can be any level deep, so we check for direct children or the same path
						const relevantDeletePaths = data.delete.filter((deletedPath) => {
							const relativePath = deletedPath.slice(path.length);
							const pathParts = parsePath(relativePath);
							// the same path (length 0) or one level deep (length 1)
							return pathParts.length <= 1;
						});

						socketEvents.queue(`${DATA_CONTEXT}:${wildcardPath}`, {
							data: {
								deleted: relevantDeletePaths,
							},
						});
						// remove deleted keys
						handledKeys = handledKeys.filter(
							(key) => !relevantDeletePaths.some((path) => path.endsWith(key))
						);
					}
				});
			}
		);
	});

	const listen: SocketDBServerAPI<Schema>['listen'] = (
		port = 8080,
		callback
	) => {
		socketServer.listen(port, callback);
	};

	return {
		listen,
		intercept: hooks.register,
		...api,
	};
}
