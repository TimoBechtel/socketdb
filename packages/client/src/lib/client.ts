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

export function SocketDBClient<Schema extends SchemaDefinition = any>({
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
						({ data: keys }: { data: string[] }) => {
							notify(() => {
								const update: { [key: string]: any } = {};
								keys.forEach((key) => (update[key] = null));
								return nodeify(update);
							});
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
								subscriptions.update.notify(path, (path) => store.get(path), {
									recursiveDown: true,
									recursiveUp: true,
								});
							});
							if (data.change) {
								const update = creatUpdate(path, data.change);
								store.put(update);
								traverseNode(update, (path, data) => {
									subscriptions.update.notify(path, () =>
										deepClone(store.get(path))
									);
									if (isObject(data.value)) {
										// with child paths, we need to notify all listeners for the wildcard path
										subscriptions.update.notify(joinPath(path, '*'), () =>
											store.get(path)
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
				let keys: string[] = [];
				const onKeysReceived = (node: Node) => {
					if (isObject(node.value)) {
						const newKeys = Object.keys(node.value).filter(
							(key) => !keys.includes(key)
						);
						newKeys.forEach((key) => {
							const refpath = joinPath(path, key);
							callback(get(refpath), key as keyof Schema);
						});
						keys = [...keys, ...newKeys];
					}
				};
				return subscriptions.update.subscribe(
					wildcardPath,
					onKeysReceived,
					() => {
						const cachedData = store.get(trimWildcard(path));
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
							const update = creatUpdate(path, node);
							const diff = mergeDiff(update, deepClone(store.get()));
							if (isNode(diff)) queueUpdate({ type: 'change', data: diff });
						})
						.catch(console.log);
				}
				return this;
			},
			delete() {
				hooks
					.call('client:delete', { args: { path } }, { asRef: true })
					.then(({ path }) => {
						queueUpdate({ type: 'delete', path });
					})
					.catch(console.log);
			},
			on(callback) {
				const listener = (data: Node) => {
					callback(unwrap(data), data.meta);
				};
				return subscriptions.update.subscribe(path, listener, () => {
					const cachedData = store.get(path);
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

function creatUpdate(path: string, data: Node): Node {
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
