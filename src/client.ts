import { parsePath } from './parsePath';
import { createStore, Store } from './store';
import { isObject, joinPath, traverseData } from './utils';

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

export function SocketDBClient(
	socket: SocketIOClient.Socket,
	{ store = createStore() }: { store?: Store } = {}
) {
	const subscribedPaths: string[] = [];
	const updateListener: UpdateListener = {};

	function notifySubscriber(diff: any) {
		const listener: UpdateListener = { ...updateListener };
		// TODO: make this thing more efficient,
		// should not go through multiple loops
		traverseData(diff, (path, data) => {
			if (listener?.[path]) {
				listener[path].forEach((listener) => listener(store.get(path)));
				delete listener[path];
			}
			// if a path is subscribed but has no data, we still need to inform subscribers
			// this has the issue, that it notifies even if data has not changed
			if (!isObject(data)) {
				Object.keys(listener).forEach((subscribedPath) => {
					if (subscribedPath.startsWith(path)) {
						listener[subscribedPath].forEach((listener) =>
							listener(store.get(subscribedPath))
						);
					}
				});
			}
		});
	}

	function addSocketPathSubscription(path: string) {
		socket.on(path, ({ data }) => {
			const diff = store.put(creatUpdate(path, data));
			notifySubscriber(diff);
		});
		subscribedPaths.push(path);
		socket.emit('subscribe', { path });
	}

	function removeSocketPathSubscription(path: string) {
		if (subscribedPaths.indexOf(path) !== -1) {
			socket.off(path);
			subscribedPaths.splice(subscribedPaths.indexOf(path));
			socket.emit('unsubscribe', { path });
		}
	}

	function findLowerLevelSubscribedPath(newPath: string) {
		return subscribedPaths.find(
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

	function findNextHighestLevelPath(path: string) {
		return Object.keys(updateListener)
			.sort((k1, k2) => k1.length - k2.length)
			.find((key) => key.startsWith(path));
	}

	function subscribe(path: string, callback: (data: any) => void) {
		if (!updateListener[path]) updateListener[path] = [];
		updateListener[path].push(callback);

		if (!isSameOrHigherLevelPathSubscribed(path)) {
			const oldPath = findLowerLevelSubscribedPath(path);
			if (oldPath) removeSocketPathSubscription(oldPath);
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
		listenersForPath.splice(listenersForPath.indexOf(callback));

		if (listenersForPath.length < 1) {
			delete updateListener[path];
			removeSocketPathSubscription(path);
			const nextPath = findNextHighestLevelPath(path);
			if (nextPath) addSocketPathSubscription(nextPath);
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
				socket.on(wildcardPath, onKeysReceived);
				socket.emit('subscribeKeys', { path });
				return () => {
					socket.off(wildcardPath, onKeysReceived);
					socket.emit('unsubscribe', { path: wildcardPath });
				};
			},
			set(value) {
				const diff = store.put(creatUpdate(path, value));
				notifySubscriber(diff);
				if (diff && Object.keys(diff).length > 0)
					socket.emit('update', { data: diff });
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
					callback(data);
					// TODO: should use subscribe {once: true}
					// and not need to send "unsubscribe" back
					unsubscribe(path, listener);
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
