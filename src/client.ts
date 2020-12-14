import { SocketClient } from './socketAdapter/socketClient';
import { createWebsocketClient } from './socketAdapter/websocketClient';
import { parsePath } from './parsePath';
import { createStore, Store } from './store';
import { isObject, joinPath, mergeDiff, traverseData } from './utils';

type Unsubscriber = () => void;

export type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	set: (value: any) => ChainReference;
	on: (callback: (data: any) => void) => Unsubscriber;
	once: (callback: (data: any) => void) => void;
};

type UpdateListener = {
	[path: string]: ((data: any) => void)[];
};

export function SocketDBClient({
	url,
	store = createStore(),
	socketClient,
}: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
} = {}) {
	if (!url && !socketClient)
		url =
			typeof window !== 'undefined'
				? `ws://${window.location.hostname}:${window.location.port}`
				: 'ws://localhost:8080';
	if (!socketClient) socketClient = createWebsocketClient({ url });

	const subscribedPaths: string[] = [];
	const updateListener: UpdateListener = {};

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
			connectionLost = false;
		}
	});
	socketClient.onDisconnect(() => (connectionLost = true));

	function notifySubscriber(diff: any) {
		const listener: UpdateListener = { ...updateListener };
		// TODO: make this thing more efficient,
		// should not go through multiple loops
		traverseData(diff, (path, data) => {
			if (listener?.[path]) {
				let storedData = store.get(path);
				if (isObject(storedData)) storedData = mergeDiff(storedData, {});
				listener[path].forEach((listener) => listener(storedData));
				delete listener[path];
			}
			// if a path is subscribed but has no data, we still need to inform subscribers
			// this has the issue, that it notifies even if data has not changed
			if (!isObject(data)) {
				Object.keys(listener).forEach((subscribedPath) => {
					if (subscribedPath.startsWith(path)) {
						let storedData = store.get(subscribedPath);
						if (isObject(storedData)) storedData = mergeDiff(storedData, {});
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

	function subscribe(path: string, callback: (data: any) => void) {
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
			if (cachedData !== null) callback(cachedData);
		}
	}

	function unsubscribe(path: string, callback: (data: any) => void) {
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
					const diff = store.put(creatUpdate(path, value));
					if (diff && Object.keys(diff).length > 0)
						socketClient.send('update', { data: diff });
					notifySubscriber(diff);
				}
				return this;
			},
			on(callback) {
				const listener = (data) => {
					callback(data);
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
					callback(data);
				});
			},
		};
	}

	return {
		...get(''),
	};
}

function creatUpdate(path: string, data: any) {
	const diff = {};
	let current = diff;
	const keys = parsePath(path);
	keys.forEach((key, i) => {
		if (i === keys.length - 1) {
			current[key] = data;
			return;
		}
		current = current[key] = {};
	});
	return diff;
}
