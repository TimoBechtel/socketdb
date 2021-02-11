import { SocketClient } from './socketAdapter/socketClient';
import { createWebsocketClient } from './socketAdapter/websocketClient';
import { parsePath } from './parsePath';
import { createStore, Store } from './store';
import { deepClone, isObject, joinPath, mergeDiff } from './utils';
import { Node, nodeify, traverseNode, unwrap } from './node';
import { createUpdateBatcher } from './updateBatcher';
import { Plugin } from './plugin';
import { createHooks, Hook } from './hooks';

type Unsubscriber = () => void;

type Meta = { [namespace: string]: any };

export type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	set: (value: any) => ChainReference;
	on: (callback: (data: any, meta: Meta) => void) => Unsubscriber;
	once: (callback: (data: any, meta: Meta) => void) => void;
};

type UpdateListener = {
	[path: string]: ((data: any) => void)[];
};

export type ClientHooks = {
	'client:set'?: Hook<{ path: string; value: any }>;
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
} = {}) {
	if (!url && !socketClient)
		url =
			typeof window !== 'undefined'
				? `ws://${window.location.hostname}:${window.location.port}`
				: 'ws://localhost:8080';
	if (!socketClient) socketClient = createWebsocketClient({ url });

	const subscribedPaths: string[] = [];
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
			Object.entries(plugin.events).forEach(
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
		socketClient.on(path, ({ data }) => {
			const diff = store.put(creatUpdate(path, data));
			notifySubscriber(diff);
		});
		subscribedPaths.push(path);
		socketClient.send('subscribe', { path });
	}

	function removeSocketPathSubscription(path: string) {
		if (subscribedPaths.indexOf(path) !== -1) {
			socketClient.off(path);
			subscribedPaths.splice(subscribedPaths.indexOf(path), 1);
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
			  in both cases we dont need to notify user on first request
			*/
			const cachedData = store.get(path);
			if (cachedData.value !== null) callback(cachedData);
		}
	}

	function unsubscribe(path: string, callback: (data: Node) => void) {
		const listenersForPath = updateListener[path];
		listenersForPath.splice(listenersForPath.indexOf(callback), 1);

		if (listenersForPath.length < 1) {
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
			set(value) {
				if (!connectionLost) {
					let clonedValue = value;
					// deep clone only if we have hooks, store.put already does a deep clone
					if (hooks.count('client:set') > 0) clonedValue = deepClone(value);
					hooks
						.call(
							'client:set',
							({ path, value }) => {
								const update = creatUpdate(path, nodeify(value));
								const diff = store.put(update);
								if (diff && Object.keys(diff).length > 0) queueUpdate(diff);
								notifySubscriber(diff);
							},
							{ path, value: clonedValue }
						)
						.catch((e) => {
							console.log(e);
						});
				}
				return this;
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
