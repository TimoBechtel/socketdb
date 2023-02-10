import {
	BatchedUpdate,
	createBatchedClient,
	createStore,
	createSubscriptionManager,
	createUpdateBatcher,
	DATA_CONTEXT,
	deepClone,
	isNode,
	isObject,
	isWildcardPath,
	joinPath,
	Json,
	LeafValue,
	mergeDiff,
	Meta,
	Node,
	nodeify,
	parsePath,
	Plugin,
	SocketClient,
	SOCKET_EVENTS,
	Store,
	traverseNode,
	trimWildcard,
	unwrap,
} from '@socketdb/core';
import { createHooks, Hook } from 'krog';
import { createWebsocketClient } from './socket-implementation/websocketClient';

export type SocketDBClientAPI<Schema extends SchemaDefinition = any> = {
	disconnect: () => void;
} & ChainReference<Schema>;

type Unsubscriber = () => void;

type SchemaDefinition = Json | LeafValue;
type RootSchemaDefinition = Json;

export type ChainReference<Schema extends SchemaDefinition = any> = {
	get<Key extends keyof Schema>(
		path: Schema extends Json ? Key : never
	): ChainReference<Schema extends Json ? Schema[Key] : never>;
	each: (
		callback: (
			ref: ChainReference<Schema extends Json ? Schema[keyof Schema] : never>,
			key: keyof Schema
		) => void
	) => Unsubscriber;
	/**
	 * Save data and optionally add meta data.
	 *
	 * When passing an empty object as value, it will be ignored.
	 * This is useful for just setting meta data without changing any data itself.
	 * Note: This behavior might change in the future.
	 */
	set: (value: Schema, meta?: Meta) => ChainReference<Schema>;
	delete: () => void;
	on: (callback: (data: Schema | null, meta?: Meta) => void) => Unsubscriber;
	once: (callback: (data: Schema | null, meta?: Meta) => void) => void;
};

export type ClientHooks = {
	'client:set'?: Hook<{
		path: string;
		value: SchemaDefinition;
		meta?: Meta;
	}>;
	'client:delete'?: Hook<{ path: string }>;
	'client:firstConnect'?: Hook;
	'client:reconnect'?: Hook;
	'client:disconnect'?: Hook;
};

export type ClientPlugin = Plugin<ClientHooks>;

export function SocketDBClient<Schema extends RootSchemaDefinition = any>({
	url: _url,
	store = createStore(),
	socketClient: _socketClient,
	updateInterval = 50,
	plugins = [],
}: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
	updateInterval?: number;
	plugins?: ClientPlugin[];
} = {}): SocketDBClientAPI<Schema> {
	// use half of the update interval, because we have two update queues resulting in double the time
	updateInterval = updateInterval / 2;

	const url: string =
		_url ||
		(typeof window !== 'undefined'
			? `ws${window.location.protocol === 'https:' ? 's' : ''}://${
					window.location.hostname
			  }:${window.location.port}`
			: 'ws://localhost:8080');
	const connection: SocketClient =
		_socketClient || createWebsocketClient({ url });

	const socketEvents = createBatchedClient(connection, updateInterval);

	const hooks = createHooks<ClientHooks>();

	registerPlugins(plugins);

	const queueUpdate = createUpdateBatcher((diff) => {
		// not deep cloning diff (for perf.), because we do not need to
		// as diff will be cleared after sending update (see queue)
		socketEvents.queue(SOCKET_EVENTS.data.clientUpdate, { data: diff });
	}, updateInterval);

	const subscriptions = {
		update: createSubscriptionManager<Node>({
			createPathSubscription(path, notify) {
				if (isWildcardPath(path)) {
					socketEvents.subscribe(
						`${DATA_CONTEXT}:${path}`,
						({
							data: updatedKeys,
						}: {
							data: { added?: string[]; deleted?: string[] };
						}) => {
							const subscribedPath = trimWildcard(path);
							if (updatedKeys.deleted) {
								updatedKeys.deleted?.forEach((deletedPath) => {
									// path is absolute here
									store.del(deletedPath);
								});
							}
							if (updatedKeys.added) {
								updatedKeys.added?.forEach((updatedPath) => {
									const absolutePath = joinPath(subscribedPath, updatedPath);
									const storedData = store.get(absolutePath);
									if (storedData === null) {
										// only set data to null if it does not exist yet (prevent overwriting data)
										// we save a null value here, so we know about that path to allow diffing key-only updates
										const update = createUpdate(absolutePath, nodeify(null));
										store.put(update);
									}
								});
							}
							notify(() => store.get(subscribedPath) ?? nodeify(null));
						}
					);
					socketEvents.queue(SOCKET_EVENTS.data.requestKeysSubscription, {
						path: trimWildcard(path),
					});
				} else {
					socketEvents.subscribe(
						`${DATA_CONTEXT}:${path}`,
						({ data }: { data: BatchedUpdate }) => {
							data.delete?.forEach((path) => {
								store.del(path);
								subscriptions.update.notify(
									path,
									(path) => store.get(path) ?? nodeify(null),
									{
										recursiveDown: true,
										recursiveUp: true,
									}
								);
							});
							if (data.change) {
								const update = createUpdate(path, data.change);
								store.put(update);
								traverseNode(update, (path, data) => {
									subscriptions.update.notify(path, () => {
										const currentData = store.get(path);
										if (currentData === null) return nodeify(null);
										return deepClone(currentData);
									});
									if (isObject(data.value)) {
										// with child paths, we need to notify all listeners for the wildcard path
										subscriptions.update.notify(
											joinPath(path, '*'),
											() => store.get(path) ?? nodeify(null)
										);
									} else {
										// notify all subscribers of all child paths that their data has been deleted
										// this has the issue, that it notifies even if data has not changed (meaning it was already null)
										// examples when this happens:
										// - path '/a' is updated with value '1', path '/a/b' is subscribed -> will be notified with value 'null'
										// - path '/a' is deleted (set to null), path '/a/b' is subscribed -> will be notified with value 'null'
										subscriptions.update.notify(path, nodeify(null), {
											excludeSelf: true,
											recursiveDown: true,
										});
									}
								});
							}
						}
					);
					socketEvents.queue(SOCKET_EVENTS.data.requestSubscription, { path });
				}
			},
			destroySubscription(path) {
				socketEvents.unsubscribe(`${DATA_CONTEXT}:${path}`);
				socketEvents.queue(SOCKET_EVENTS.data.requestUnsubscription, { path });
			},
			restoreSubscription(path) {
				if (isWildcardPath(path)) {
					socketEvents.queue(SOCKET_EVENTS.data.requestKeysSubscription, {
						path: trimWildcard(path),
					});
				} else {
					socketEvents.queue(SOCKET_EVENTS.data.requestSubscription, { path });
				}
			},
		}),
	};

	let connectionLost = false;
	connection.onConnect(() => {
		if (connectionLost) {
			// reattach subscriptions on every reconnect
			subscriptions.update.resubscribe();

			hooks.call('client:reconnect');
			connectionLost = false;
		} else {
			hooks.call('client:firstConnect');
		}
	});
	connection.onDisconnect(() => {
		hooks.call('client:disconnect');
		connectionLost = true;
	});

	function registerPlugins(plugins: ClientPlugin[]) {
		plugins.forEach((plugin) => {
			Object.entries(plugin.hooks).forEach(
				([name, hook]: [string, ClientHooks[keyof ClientHooks]]) => {
					hooks.register(name as keyof ClientHooks, hook);
				}
			);
		});
	}

	function get<Schema extends SchemaDefinition>(
		path: string
	): ChainReference<Schema> {
		const rootPath = path;
		return {
			get(path) {
				if (isWildcardPath(String(path)))
					throw new Error('You cannot use * (wildcard) as a pathname.');
				return get(joinPath(rootPath, String(path)));
			},
			each(callback) {
				const wildcardPath = joinPath(path, '*');
				let handledKeys: string[] = [];
				const onKeysReceived = (node: Node) => {
					// node is a snapshot of the store for the given path
					if (isObject(node.value)) {
						const receivedKeys = Object.keys(node.value);

						const unhandledKeys = receivedKeys.filter(
							(key) => !handledKeys.includes(key)
						);

						// notify about new keys
						unhandledKeys.forEach((key) => {
							const refpath = joinPath(path, key);
							callback(get(refpath), key as keyof Schema);
						});

						// update handled keys
						handledKeys = receivedKeys;
					} else {
						// the path may be updated to a non-object value
						handledKeys = [];
					}
				};
				return subscriptions.update.subscribe(
					wildcardPath,
					onKeysReceived,
					() => {
						const cachedData = store.get(trimWildcard(path));
						if (cachedData === null) return null;
						return cachedData.value === null ? null : cachedData;
					}
				);
			},
			set(value, meta) {
				if (!connectionLost) {
					hooks
						.call('client:set', { args: { path, value, meta } })
						.then(({ path, value, meta }) => {
							const node = nodeify(value);
							if (meta) node.meta = meta;
							const update = createUpdate(path, node);
							const currentData = store.get();
							const diff =
								currentData === null
									? update
									: mergeDiff(update, deepClone(currentData));
							if (isNode(diff)) queueUpdate({ type: 'change', data: diff });
						})
						.catch(console.warn);
				}
				return this;
			},
			delete() {
				hooks
					.call('client:delete', { args: { path } }, { asRef: true })
					.then(({ path }) => {
						queueUpdate({ type: 'delete', path });
					})
					.catch(console.warn);
			},
			on(callback) {
				const listener = (data: Node) => {
					callback(unwrap(data), data.meta);
				};
				return subscriptions.update.subscribe(path, listener, () => {
					const cachedData = store.get(path);
					if (cachedData === null) return null;
					return cachedData.value === null ? null : cachedData;
				});
			},
			once(callback) {
				subscriptions.update.subscribe(
					path,
					function listener(data) {
						// maybe should use subscribe {once: true} ?
						// and not send "unsubscribe" back
						subscriptions.update.unsubscribe(path, listener);
						callback(unwrap(data), data.meta);
					},
					() => {
						const cachedData = store.get(path);
						if (cachedData === null) return null;
						return cachedData.value === null ? null : cachedData;
					}
				);
			},
		};
	}

	return {
		...get(''),
		disconnect() {
			connection.close();
		},
	};
}

function createUpdate(path: string, data: Node): Node {
	const diff: { value: { [key: string]: Node } } = { value: {} };
	let current = diff;
	const keys = parsePath(path);
	keys.forEach((key, i) => {
		if (i === keys.length - 1) {
			current.value[key] = data;
			return;
		}
		current = current.value[key] = { value: {} };
	});
	return diff;
}
