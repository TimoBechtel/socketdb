import {
	BatchedUpdate,
	createBatchedClient,
	createStore,
	createUpdateBatcher,
	DATA_CONTEXT,
	deepClone,
	isObject,
	joinPath,
	Node,
	nodeify,
	normalizePath,
	parsePath,
	Plugin,
	SessionContext,
	SocketServer,
	SOCKET_EVENTS,
	Store,
	traverseNode,
} from '@socketdb/core';
import { createHooks, Hook } from 'krog';
import { createWebsocketServer } from './socket-implementation/websocketServer';

type Subscriptions = {
	[id: string]: { [path: string]: (data: BatchedUpdate) => void };
};

export type SocketDBServerAPI = {
	update: (data: Node) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
};

/**
 * @deprecated. Use SocketDBServerAPI instead.
 * Type alias will be removed in a future update.
 */
export type SocketDB = SocketDBServerAPI;

export type ServerHooks = {
	'server:clientConnect'?: Hook<
		{ id: string },
		{ client: { id: string; context: SessionContext }; api: SocketDBServerAPI }
	>;
	'server:clientDisconnect'?: Hook<
		{ id: string },
		{ client: { id: string; context: SessionContext }; api: SocketDBServerAPI }
	>;
	'server:update'?: Hook<
		{ data: Node },
		// if client id is null, it means the update comes from the server
		// TODO: allow client object to be null, when update comes from server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerAPI;
		}
	>;
	'server:delete'?: Hook<
		{ path: string },
		// if client id is null, it means the deletion comes from the server
		// TODO: allow client object to be null, when update comes from server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerAPI;
		}
	>;
};

export type ServerPlugin = Plugin<ServerHooks>;

export function SocketDBServer({
	port = 8080,
	store = createStore(),
	updateInterval = 50,
	socketServer = createWebsocketServer({ port }),
	plugins = [],
}: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin[];
} = {}): SocketDBServerAPI {
	// use half of the update interval, because we have two update queues resulting in double the time
	updateInterval = updateInterval / 2;

	const subscriber: Subscriptions = {};

	const api: SocketDBServerAPI = {
		update,
		get: (path: string): Node => {
			const data = store.get(path);
			if (!data) return nodeify(null);
			return deepClone(data);
		},
		delete: del,
	};

	const queue = createUpdateBatcher(notifySubscribers, updateInterval);

	const hooks = createHooks<ServerHooks>();
	registerPlugins(plugins);

	function registerPlugins(plugins: ServerPlugin[]) {
		plugins.forEach((plugin) => {
			Object.entries(plugin.hooks).forEach(
				([name, hook]: [string, ServerHooks[keyof ServerHooks]]) => {
					hooks.register(name as keyof ServerHooks, hook);
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
				const deletePaths: string[] =
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
		path: string,
		callback: (diff: BatchedUpdate) => void
	) {
		if (!subscriber[id]) subscriber[id] = {};
		subscriber[id][path] = callback;
	}

	function removeSubscriber(id: string, path: string) {
		if (subscriber[id]) {
			delete subscriber[id][path];
		}
	}

	socketServer.onConnection((connection, id, context = {}) => {
		const clientContext = { id, context };
		const socketEvents = createBatchedClient(connection, updateInterval);
		hooks.call(
			'server:clientConnect',
			{
				args: { id },
				context: { client: clientContext, api },
			},
			{ asRef: true }
		);

		connection.onDisconnect(() => {
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
					// destructure keys to only send the current keys, as they might change while queued
					socketEvents.queue(`${DATA_CONTEXT}:${wildcardPath}`, {
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
	return api;
}
