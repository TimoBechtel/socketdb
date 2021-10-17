import { createHooks, Hook } from './hooks';
import {
	isNode,
	KeyValue,
	Meta,
	Node,
	nodeify,
	traverseNode,
	unwrap,
	Value,
} from './node';
import { isWildcardPath, joinPath, parsePath, trimWildcard } from './path';
import { Plugin } from './plugin';
import { SocketClient } from './socketAdapter/socketClient';
import { createWebsocketClient } from './socketAdapter/websocketClient';
import { createStore, Store } from './store';
import { BatchedUpdate, createUpdateBatcher } from './updateBatcher';
import { deepClone, isObject, mergeDiff } from './utils';

export type SocketDBClientAPI<Schema extends SchemaDefinition = any> = {
	disconnect: () => void;
} & ChainReference<Schema>;

type Unsubscriber = () => void;

type SchemaDefinition = KeyValue | Value;

export type ChainReference<Schema extends SchemaDefinition = any> = {
	get<Key extends keyof Schema>(
		path: Schema extends KeyValue ? Key : never
	): ChainReference<Schema extends KeyValue ? Schema[Key] : never>;
	each: (
		callback: (
			ref: ChainReference<
				Schema extends KeyValue ? Schema[keyof Schema] : never
			>,
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

type UpdateListener = {
	[path: string]: ((data: any) => void)[];
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
	let url: string =
		_url ||
		(typeof window !== 'undefined'
			? `ws${window.location.protocol === 'https:' ? 's' : ''}://${
					window.location.hostname
			  }:${window.location.port}`
			: 'ws://localhost:8080');
	let socketClient: SocketClient =
		_socketClient || createWebsocketClient({ url });

	let subscribedPaths: string[] = [];
	const updateListener: UpdateListener = {};
	const hooks = createHooks<ClientHooks>();

	registerPlugins(plugins);

	const queueUpdate = createUpdateBatcher((diff) => {
		socketClient.send('update', { data: diff });
	}, updateInterval);

	let connectionLost = false;
	socketClient.onConnect(() => {
		if (connectionLost) {
			// reattach subscriptions on every reconnect
			subscribedPaths.forEach((path) => {
				if (isWildcardPath(path)) {
					socketClient.send('subscribeKeys', { path: trimWildcard(path) });
				} else {
					socketClient.send('subscribe', { path });
				}
			});
			hooks.call('client:reconnect');
			connectionLost = false;
		} else {
			hooks.call('client:firstConnect');
		}
	});
	socketClient.onDisconnect(() => {
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

	function notifySubscriber(diff: Node) {
		const listener: UpdateListener = { ...updateListener };
		// TODO: make this thing more efficient,
		// should not go through multiple loops
		traverseNode(diff, (path, data) => {
			const wildcardPath = joinPath(path, '*');
			if (listener[path] || listener[wildcardPath]) {
				let storedData = deepClone(store.get(path));
				if (listener[path]) {
					listener[path].forEach((listener) => listener(storedData));
					delete listener[path];
				}
				if (listener[wildcardPath]) {
					listener[wildcardPath].forEach((listener) => listener(storedData));
					delete listener[wildcardPath];
				}
			}
			// if a path is subscribed but has no data, we still need to inform subscribers
			// this has the issue, that it notifies even if data has not changed
			if (!isObject(data.value)) {
				Object.keys(listener).forEach((subscribedPath) => {
					if (subscribedPath.startsWith(path)) {
						let storedData = store.get(subscribedPath);
						storedData = deepClone(storedData);
						listener[subscribedPath].forEach((listener) =>
							listener(storedData)
						);
					}
				});
			}
		});
	}

	function addSocketPathSubscription(path: string) {
		if (isWildcardPath(path)) {
			socketClient.on(path, ({ data: keys }: { data: string[] }) => {
				const update: { [key: string]: any } = {};
				keys.forEach((key) => (update[key] = null));
				updateListener[path].forEach((callback) => callback(nodeify(update)));
			});
			subscribedPaths.push(path);
			socketClient.send('subscribeKeys', { path: trimWildcard(path) });
		} else {
			socketClient.on(path, ({ data }: { data: BatchedUpdate }) => {
				data.delete?.forEach((path) => {
					store.del(path);
					const diff = creatUpdate(path, nodeify(null));
					notifySubscriber(diff);
				});
				if (data.change) {
					const update = creatUpdate(path, data.change);
					store.put(update);
					notifySubscriber(update);
				}
			});
			subscribedPaths.push(path);
			socketClient.send('subscribe', { path });
		}
	}

	function removeSocketPathSubscription(path: string) {
		if (subscribedPaths.indexOf(path) !== -1) {
			socketClient.off(path);
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
			socketClient.send('unsubscribe', { path });
		}
	}

	function findLowerLevelSubscribedPaths(newPath: string) {
		return subscribedPaths.filter(
			(subscribedPath) =>
				subscribedPath.length > newPath.length &&
				subscribedPath.startsWith(newPath)
		);
	}

	function isSameOrHigherLevelPathSubscribed(path: string): boolean {
		return subscribedPaths.some((subscribedPath) =>
			path.startsWith(subscribedPath)
		);
	}

	function findNextHighestLevelPaths(path: string): string[] {
		return Object.keys(updateListener)
			.sort((k1, k2) => parsePath(k1).length - parsePath(k2).length)
			.reduce((arr: string[], key: string) => {
				if (key.startsWith(path)) {
					if (!arr.some((k) => key.startsWith(k))) {
						arr.push(key);
					}
				}
				return arr;
			}, []);
	}

	function subscribe(path: string, callback: (data: Node) => void) {
		if (!updateListener[path]) updateListener[path] = [];
		updateListener[path].push(callback);

		if (!isSameOrHigherLevelPathSubscribed(path)) {
			const oldPaths = findLowerLevelSubscribedPaths(path);
			oldPaths.forEach(removeSocketPathSubscription);
			addSocketPathSubscription(path);
		} else {
			/* 
			  if cached data is null, it either means:
			   a) we have no data yet, or:
			   b) data does not exist on server yet/anymore
			  in both cases we don't need to notify user on first request
			*/
			const cachedData = store.get(trimWildcard(path));
			if (cachedData.value !== null) callback(cachedData);
		}
	}

	function unsubscribe(path: string, callback: (data: Node) => void) {
		updateListener[path] = updateListener[path].filter((l) => l !== callback);

		if (updateListener[path].length < 1) {
			delete updateListener[path];
			removeSocketPathSubscription(path);
			const nextPaths = findNextHighestLevelPaths(path);
			nextPaths.forEach(addSocketPathSubscription);
		}
	}

	function get<Schema extends SchemaDefinition>(
		path: string
	): ChainReference<Schema> {
		const rootPath = path;
		return {
			get(path) {
				if (isWildcardPath(path + ''))
					throw new Error('You cannot use * (wildcard) as a pathname.');
				return get(joinPath(rootPath, path + ''));
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
				subscribe(wildcardPath, onKeysReceived);
				return () => {
					unsubscribe(wildcardPath, onKeysReceived);
				};
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
				subscribe(path, listener);
				return () => {
					unsubscribe(path, listener);
				};
			},
			once(callback) {
				subscribe(path, function listener(data) {
					// maybe should use subscribe {once: true} ?
					// and not send "unsubscribe" back
					unsubscribe(path, listener);
					callback(unwrap(data), data.meta);
				});
			},
		};
	}

	return {
		...get(''),
		disconnect() {
			socketClient.close();
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
