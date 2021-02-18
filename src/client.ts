import { SocketClient } from './socketAdapter/socketClient';
import { createWebsocketClient } from './socketAdapter/websocketClient';
import { parsePath } from './parsePath';
import { createStore, Store } from './store';
import { deepClone, isObject, joinPath, mergeDiff } from './utils';
import { Node, nodeify, traverseNode, unwrap } from './node';
import { BatchedUpdate, createUpdateBatcher } from './updateBatcher';
import { Plugin } from './plugin';
import { createHooks, Hook } from './hooks';

export type SocketDBClientAPI = {
	disconnect: () => void;
} & ChainReference;

type Unsubscriber = () => void;
type Meta = Node['meta'];

export type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	set: (value: any, meta?: Meta) => ChainReference;
	delete: () => void;
	on: (callback: (data: any, meta: Meta) => void) => Unsubscriber;
	once: (callback: (data: any, meta: Meta) => void) => void;
};

type UpdateListener = {
	[path: string]: ((data: any) => void)[];
};

export type ClientHooks = {
	'client:set'?: Hook<{ path: string; value: any; meta: Meta }>;
	'client:delete'?: Hook<{ path: string }>;
	'client:firstConnect'?: Hook<void>;
	'client:reconnect'?: Hook<void>;
	'client:disconnect'?: Hook<void>;
};

export type ClientPlugin = Plugin<ClientHooks>;

export function SocketDBClient({
	url,
	store = createStore(),
	socketClient,
	updateInterval = 50,
	plugins = [],
}: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
	updateInterval?: number;
	plugins?: ClientPlugin[];
} = {}): SocketDBClientAPI {
	if (!url && !socketClient)
		url =
			typeof window !== 'undefined'
				? `ws://${window.location.hostname}:${window.location.port}`
				: 'ws://localhost:8080';
	if (!socketClient) socketClient = createWebsocketClient({ url });

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
				if (path.endsWith('*')) {
					socketClient.send('subscribeKeys', { path });
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
				([name, hook]: [keyof ClientHooks, ClientHooks[keyof ClientHooks]]) => {
					hooks.register(name, hook);
				}
			);
		});
	}

	function notifySubscriber(diff: Node) {
		const listener: UpdateListener = { ...updateListener };
		// TODO: make this thing more efficient,
		// should not go through multiple loops
		traverseNode(diff, (path, data) => {
			if (listener?.[path]) {
				let storedData = deepClone(store.get(path));
				listener[path].forEach((listener) => listener(storedData));
				delete listener[path];
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
		socketClient.on(path, ({ data }: { data: BatchedUpdate }) => {
			data.delete?.forEach((path) => {
				store.del(path);
				const diff = creatUpdate(path, nodeify(null));
				notifySubscriber(diff);
			});
			if (data.change) {
				const diff = store.put(creatUpdate(path, data.change));
				notifySubscriber(diff);
			}
		});
		subscribedPaths.push(path);
		socketClient.send('subscribe', { path });
	}

	function removeSocketPathSubscription(path: string) {
		if (subscribedPaths.indexOf(path) !== -1) {
			socketClient.off(path);
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
			socketClient.send('unsubscribe', { path });
			/*
			 * delete data when unscubscribing from path
			 * this is a workaround for the issue, that when rescrubscribing,
			 * the received initial data is not different from the stored data
			 * and therefore functions like "once/on" will not be triggered.
			 * Drawback is, that lower level path listeners might be triggered multiple times with the same value
			 * (as the value was deleted before and now seems to be new)
			 * TODO: this will be changed in the next major release
			 */
			store.del(path);
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
			  in both cases we dont need to notify user on first request
			*/
			const cachedData = store.get(path);
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

	function get(path: string): ChainReference {
		const rootPath = path;
		return {
			get(path: string): ChainReference {
				return get(joinPath(rootPath, path));
			},
			each(callback) {
				const wildcardPath = joinPath(path, '*');
				const onKeysReceived = ({ data }) => {
					data.forEach((key) => {
						const refpath = joinPath(path, key);
						callback(get(refpath), key);
					});
				};
				socketClient.on(wildcardPath, onKeysReceived);
				socketClient.send('subscribeKeys', { path });
				subscribedPaths.push(wildcardPath);
				return () => {
					removeSocketPathSubscription(wildcardPath);
				};
			},
			set(value, meta) {
				if (!connectionLost) {
					hooks
						.call('client:set', { path, value, meta })
						.then(({ path, value, meta }) => {
							const node = nodeify(value);
							if (meta) node.meta = meta;
							let update = creatUpdate(path, node);
							if (isSameOrHigherLevelPathSubscribed(path))
								update = store.put(update);
							if (update && Object.keys(update).length > 0)
								queueUpdate({ type: 'change', data: update });
							notifySubscriber(update);
						})
						.catch(console.log);
				}
				return this;
			},
			delete() {
				hooks
					.call('client:delete', { path }, { asRef: true })
					.then(({ path }) => {
						store.del(path);
						const diff = creatUpdate(path, nodeify(null));
						queueUpdate({ type: 'delete', path });
						notifySubscriber(diff);
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
	const diff: Node = { value: {} };
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
