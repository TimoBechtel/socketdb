import socketio from 'socket.io';
import { createStore, Store } from './store';
import { isObject, joinPath, merge, traverseData } from './utils';

type Subscribtions = {
	[id: string]: { [path: string]: (data: any) => void };
};

export type SocketDB = {
	update: (data: any) => void;
	get: (path: string) => any;
};

export function SocketDBServer(
	socketioServer: socketio.Server,
	{
		store = createStore(),
		updateInterval = 50,
	}: { store?: Store; updateInterval?: number } = {}
): SocketDB {
	let subscriber: Subscribtions = {};

	let queuedUpdate: any;
	let pendingUpdate = null;

	function queueUpdate(diff: any) {
		if (pendingUpdate) {
			merge(diff, queuedUpdate);
		} else {
			queuedUpdate = diff;
			pendingUpdate = setTimeout(() => {
				pendingUpdate = null;
				notifySubscibers(queuedUpdate);
			}, updateInterval);
		}
	}

	function update(data: any) {
		const diff = store.put(data);
		queueUpdate(diff);
	}

	function notifySubscibers(diff: any) {
		Object.values(subscriber).forEach((paths) => {
			traverseData(diff, (path, data) => {
				if (!paths[path]) return;
				paths[path](data);
			});
		});
	}

	function addSubscriber(id: string, path: string, callback) {
		if (!subscriber[id]) subscriber[id] = {};
		subscriber[id][path] = callback;
	}

	function removeSubscriber(id: string, path: string) {
		if (subscriber[id]) {
			delete subscriber[id][path];
		}
	}

	socketioServer.on('connect', (socket) => {
		socket.on('update', ({ data }) => {
			update(data);
		});
		socket.on('subscribe', ({ path, once }) => {
			socket.emit(path, { data: store.get(path) });
			if (once) return;
			addSubscriber(socket.id, path, (data) => {
				socket.emit(path, { data });
			});
		});
		socket.on('unsubscribe', ({ path }) => {
			removeSubscriber(socket.id, path);
		});
		socket.on('subscribeKeys', ({ path }) => {
			const data = store.get(path);
			const wildcardPath = joinPath(path, '*');
			let keys = [];
			if (isObject(data)) {
				keys = Object.keys(data);
				socket.emit(wildcardPath, { data: keys });
			}
			addSubscriber(socket.id + 'wildcard', path, (data) => {
				if (isObject(data)) {
					const newKeys = Object.keys(data).filter(
						(key) => !keys.includes(key)
					);
					if (newKeys.length > 0) socket.emit(wildcardPath, { data: newKeys });
					keys = [...keys, ...newKeys];
				}
			});
		});
	});
	return {
		update,
		get: store.get,
	};
}
