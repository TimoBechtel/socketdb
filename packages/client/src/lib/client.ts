import {
	DATA_CONTEXT,
	SOCKET_EVENTS,
	createBatchedClient,
	createStore,
	createSubscriptionManager,
	createUpdateBatcher,
	isNode,
	isObject,
	isWildcardPath,
	joinPath,
	mergeDiff,
	nodeify,
	normalizePath,
	parsePath,
	simpleDeepClone,
	traverseNode,
	trimWildcard,
	unwrap,
	type BatchedUpdate,
	type ConnectionEvents,
	type DataEvents,
	type GoodbyeMessage,
	type Json,
	type KeepAliveEvents,
	type LeafValue,
	type Meta,
	type Node,
	type NormalizedPath,
	type Plugin,
	type SocketClient,
	type Store,
} from '@socketdb/core';
import { createHooks, type Hook } from 'krog';
import {
	__isDefaultWebsocketClient,
	createWebsocketClient,
} from './socket-implementation/websocketClient';

export type SocketDBClientAPI<Schema extends SchemaDefinition = any> = {
	connect: (url?: string) => void;
	disconnect: () => void;
	intercept: <Hook extends keyof ClientHooks>(
		hook: Hook,
		callback: ClientHooks[Hook]
	) => () => void;
} & ChainReference<Schema>;

type Unsubscriber = () => void;

type SchemaDefinition = Json | LeafValue;
type RootSchemaDefinition = Json;

export type ChainReference<Schema extends SchemaDefinition = any> = {
	get<Key extends keyof Schema>(
		path: Schema extends Json ? Key : never
	): ChainReference<Schema extends Json ? Schema[Key] : never>;
	/**
	 * Group multiple subscriptions together.
	 * This is useful if you want to unsubscribe from multiple subscriptions at once.
	 *
	 * @example
	 * const unsubscribe = db.get('posts').subscribeGroup((_db) => {
	 * 	_db.each((node, key) => {
	 * 		console.log(`New post with id ${key} added!`);
	 * 		node.on((post) => {
	 * 			console.log(`Post with id ${key} was updated!`);
	 * 		});
	 * 	});
	 * });
	 *
	 * // unsubscribe from all subscriptions
	 * unsubscribe();
	 */
	subscribeGroup: (
		callback: (ref: ChainReference<Schema>) => void
	) => Unsubscriber;
	/**
	 * Allows you to subscribe to sub-nodes of a path.
	 * It will be called every time a new node was added to a path.
	 *
	 * @example
	 * db.get('posts').each((node, key) => {
	 *   console.log(`New post with id ${key} added!`);
	 *   node.on((post) => {
	 *    console.log(`Post with id ${key} was updated!`);
	 *   });
	 * });
	 *
	 */
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
	set: (
		// while we technically can set partial data, the type doesn't allow it yet
		// we might loosen the type in the future e.g. RecursivePartial<Schema>
		value: Schema,
		meta?: Meta
	) => ChainReference<Schema>;
	delete: () => void;
	on: (callback: (data: Schema | null, meta?: Meta) => void) => Unsubscriber;
	once: (callback: (data: Schema | null, meta?: Meta) => void) => Unsubscriber;
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
	/**
	 * Called when the client is disconnected from the server.
	 *
	 * If the connection is closed by the server,
	 * "client:serverDisconnectMessage" will also be called before this hook.
	 */
	'client:disconnect'?: Hook;
	/**
	 * Called when the client receives a goodbye message from the server,
	 * before the server closes the connection.
	 *
	 * It includes the reason why the server disconnected the client.
	 */
	'client:serverDisconnectMessage'?: Hook<GoodbyeMessage>;
	/**
	 * Called before the client sends a heartbeat to the server.
	 *
	 * The payload coming from the server will be passed as a argument.
	 * Returned value will be sent to the server as heartbeat payload.
	 */
	'client:heartbeat'?: Hook<Record<string, unknown>>;
};

export type ClientPlugin = Plugin<ClientHooks>;

export function SocketDBClient<Schema extends RootSchemaDefinition = any>({
	store = createStore(),
	socketClient: _socketClient,
	updateInterval = 50,
	plugins = [],
}: {
	store?: Store;
	socketClient?: SocketClient;
	updateInterval?: number;
	plugins?: ClientPlugin[];
} = {}): SocketDBClientAPI<Schema> {
	// use half of the update interval, because we have two update queues resulting in double the time
	updateInterval = updateInterval / 2;

	const connection = _socketClient || createWebsocketClient();

	const socketEvents = createBatchedClient<
		KeepAliveEvents & DataEvents & ConnectionEvents
	>(connection, updateInterval);

	socketEvents.subscribe('connection:goodbye', (payload) => {
		hooks.call('client:serverDisconnectMessage', { args: payload });
	});

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
										return simpleDeepClone(currentData);
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

	// answer keep-alive checks
	socketEvents.subscribe(SOCKET_EVENTS.keepAlive.ping, (payload) => {
		hooks
			.call('client:heartbeat', { args: payload })
			.then((payload) => {
				socketEvents.queue(SOCKET_EVENTS.keepAlive.pong, payload);
			})
			.catch(console.warn);
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
		rootPath: string,
		context: {
			unsubscriber?: Unsubscriber[];
		} = {}
	): ChainReference<Schema> {
		const normalizedPath = normalizePath(rootPath);
		return {
			get(path) {
				if (isWildcardPath(String(path)))
					throw new Error('You cannot use * (wildcard) as a pathname.');
				return get(joinPath(normalizedPath, String(path)), context);
			},
			each(callback) {
				const wildcardPath = joinPath(normalizedPath, '*');
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
							const refpath = joinPath(normalizedPath, key);
							callback(get(refpath, context), key as keyof Schema);
						});

						// update handled keys
						handledKeys = receivedKeys;
					} else {
						// the path may be updated to a non-object value
						handledKeys = [];
					}
				};
				const unsubscribe = subscriptions.update.subscribe(
					wildcardPath,
					onKeysReceived,
					() => {
						const cachedData = store.get(normalizedPath);
						if (cachedData === null) return null;
						return cachedData.value === null ? null : cachedData;
					}
				);

				if (context.unsubscriber) {
					context.unsubscriber.push(unsubscribe);
				}

				return unsubscribe;
			},
			set(value, meta) {
				if (!connectionLost) {
					hooks
						.call('client:set', { args: { path: normalizedPath, value, meta } })
						.then(({ path, value, meta }) => {
							const node = nodeify(value);
							if (meta) node.meta = meta;
							const update = createUpdate(normalizePath(path), node);
							const currentData = store.get();
							const diff =
								currentData === null
									? update
									: // note: simpleDeepClone skips leaf values (e.g. arrays),
									  // but mergeDiff will also skip them, so it's fine here
									  mergeDiff(update, simpleDeepClone(currentData));
							if (isNode(diff)) queueUpdate({ type: 'change', data: diff });
						})
						.catch(console.warn);
				}
				return this;
			},
			delete() {
				hooks
					.call(
						'client:delete',
						{ args: { path: normalizedPath } },
						{ asRef: true }
					)
					.then(({ path }) => {
						queueUpdate({ type: 'delete', path: normalizePath(path) });
					})
					.catch(console.warn);
			},
			on(callback) {
				const listener = (data: Node) => {
					callback(unwrap(data), data.meta);
				};
				const unsubscribe = subscriptions.update.subscribe(
					normalizedPath,
					listener,
					() => {
						const cachedData = store.get(normalizedPath);
						if (cachedData === null) return null;
						return cachedData.value === null ? null : cachedData;
					}
				);

				if (context.unsubscriber) {
					context.unsubscriber.push(unsubscribe);
				}

				return unsubscribe;
			},
			once(callback) {
				const unsubscribe = subscriptions.update.subscribe(
					normalizedPath,
					function listener(data) {
						// maybe should use subscribe {once: true} ?
						// and not send "unsubscribe" back
						subscriptions.update.unsubscribe(normalizedPath, listener);
						callback(unwrap(data), data.meta);
					},
					() => {
						const cachedData = store.get(normalizedPath);
						if (cachedData === null) return null;
						return cachedData.value === null ? null : cachedData;
					}
				);

				if (context.unsubscriber) {
					context.unsubscriber.push(unsubscribe);
				}

				return unsubscribe;
			},
			subscribeGroup(callback) {
				const unsubscriber: Unsubscriber[] = [];
				callback(get(normalizedPath, { unsubscriber }));
				return () => {
					unsubscriber.forEach((unsubscribe) => unsubscribe());
				};
			},
		};
	}

	return {
		...get(''),
		intercept: hooks.register,
		disconnect() {
			connection.close();
		},
		connect(url) {
			url =
				url ||
				(typeof window !== 'undefined'
					? `ws${window.location.protocol === 'https:' ? 's' : ''}://${
							window.location.hostname
					  }:${window.location.port}`
					: 'ws://localhost:8080');
			if (__isDefaultWebsocketClient(connection)) {
				connection.connect(url);
			}
		},
	};
}

function createUpdate(path: NormalizedPath, data: Node): Node {
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
