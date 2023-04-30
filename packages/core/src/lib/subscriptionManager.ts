import { type NormalizedPath, isChildPath, parsePath } from './path';

type UpdateListener<T> = {
	[path: NormalizedPath]: ((data: T) => void)[];
};
/**
 * manages client side subscriptions to the server
 * - manages listeners to various paths
 * - manages sending subscription requests to the server
 * - keeps amount of subscriptions to a minimum to prevent redundant update packets
 */
export function createSubscriptionManager<DataType = any>({
	createPathSubscription,
	destroySubscription,
	restoreSubscription,
}: {
	/**
	 * Called when a subscription is created. Used to subscript to websocket events.
	 * @param path The path of the subscription.
	 * @param notify Notify listeners about new data.
	 */
	createPathSubscription: (
		path: NormalizedPath,
		notify: (
			data: DataType | (() => DataType),
			options?: {
				// recursively notify all children
				recursiveDown?: boolean;
				// recursively notify all parents
				recursiveUp?: boolean;
				// only notify children/parents ignoring the current path
				excludeSelf?: boolean;
			}
		) => void
	) => void;
	destroySubscription: (path: NormalizedPath) => void;
	restoreSubscription: (path: NormalizedPath) => void;
}) {
	let subscribedPaths: NormalizedPath[] = [];
	const updateListener: UpdateListener<DataType> = {};

	function addSocketPathSubscription(path: NormalizedPath) {
		subscribedPaths.push(path);
		createPathSubscription(path, (data, options) => {
			notify(path, data, options);
		});
	}

	function removeSocketPathSubscription(path: NormalizedPath) {
		if (subscribedPaths.indexOf(path) !== -1) {
			subscribedPaths = subscribedPaths.filter((p) => p !== path);
			destroySubscription(path);
		}
	}

	function isSameOrHigherLevelPathSubscribed(path: NormalizedPath): boolean {
		return subscribedPaths.some(
			(subscribedPath) =>
				path === subscribedPath || isChildPath(path, subscribedPath)
		);
	}

	function findNextHighestLevelPaths(path: NormalizedPath): NormalizedPath[] {
		return Object.keys(updateListener)
			.sort((k1, k2) => parsePath(k1).length - parsePath(k2).length)
			.reduce((arr: string[], key: string) => {
				if (key.startsWith(path)) {
					if (!arr.some((k) => key.startsWith(k))) {
						arr.push(key);
					}
				}
				return arr;
			}, []) as NormalizedPath[];
	}

	function findLowerLevelSubscribedPaths(newPath: string) {
		return subscribedPaths.filter(
			(subscribedPath) =>
				subscribedPath.length > newPath.length &&
				subscribedPath.startsWith(newPath)
		);
	}

	function subscribe(
		path: NormalizedPath,
		callback: (data: DataType) => void,
		fromCache?: () => DataType | null
	) {
		if (!updateListener[path]) updateListener[path] = [];
		updateListener[path].push(callback);

		if (!isSameOrHigherLevelPathSubscribed(path)) {
			const oldPaths = findLowerLevelSubscribedPaths(path);
			oldPaths.forEach(removeSocketPathSubscription);
			addSocketPathSubscription(path);
		} else {
			/*
			  if path is not subscribed, but a higher level path is,
			  we assume that the cached data is already up to date
			  and we notify the callback with the cached data.

			  If cached data is null, it either means:
			   a) we have no data yet, or:
			   b) data does not exist on server yet/anymore
			  in both cases we don't need to notify user on first request
			*/
			const cachedData = fromCache ? fromCache() : null;
			if (cachedData) callback(cachedData);
		}

		return () => {
			unsubscribe(path, callback);
		};
	}

	function unsubscribe(
		path: NormalizedPath,
		callback: (data: DataType) => void
	) {
		if (!updateListener[path]) return;

		updateListener[path] = updateListener[path].filter((l) => l !== callback);

		if (updateListener[path].length < 1) {
			delete updateListener[path];
			removeSocketPathSubscription(path);
			const nextPaths = findNextHighestLevelPaths(path);
			nextPaths.forEach(addSocketPathSubscription);
		}
	}

	function resubscribe() {
		subscribedPaths.forEach(restoreSubscription);
	}

	function isRetrieverFunction(
		data: DataType | ((path: string) => DataType)
	): data is (path: string) => DataType {
		return typeof data === 'function';
	}

	/**
	 *
	 * @param path The path that should be notified.
	 * @param data The data to notify listeners about.
	 * If the data is a function, it will be called with the path as argument.
	 * This will then only be called if the path is subscribed.
	 * @param options
	 */
	function notify(
		path: NormalizedPath,
		data: DataType | ((path: string) => DataType),
		options: {
			// recursively notify all children
			recursiveDown?: boolean;
			// recursively notify all parents
			recursiveUp?: boolean;
			// only notify children/parents ignoring the current path
			excludeSelf?: boolean;
		} = {
			excludeSelf: false,
			recursiveDown: false,
			recursiveUp: false,
		}
	) {
		if (!options.excludeSelf) {
			for (const listener of updateListener[path] || []) {
				listener(isRetrieverFunction(data) ? data(path) : data);
			}
		}
		if (options.recursiveDown || options.recursiveUp) {
			(Object.keys(updateListener) as NormalizedPath[]).forEach(
				(subscribedPath) => {
					if (options.recursiveDown && isChildPath(subscribedPath, path)) {
						for (const listener of updateListener[subscribedPath] || []) {
							listener(isRetrieverFunction(data) ? data(subscribedPath) : data);
						}
					}
					if (options.recursiveUp && isChildPath(path, subscribedPath)) {
						for (const listener of updateListener[subscribedPath] || []) {
							listener(isRetrieverFunction(data) ? data(subscribedPath) : data);
						}
					}
				}
			);
		}
	}

	return {
		subscribe,
		unsubscribe,
		resubscribe,
		notify,
	};
}
