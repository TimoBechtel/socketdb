import { SocketServer } from './socketAdapter/socketServer';
import { createWebsocketServer } from './socketAdapter/websocketServer';
import { createStore, Store } from './store';
import { isObject, joinPath, mergeDiff, traverseData } from './utils';

type Subscribtions = {
	[id: string]: { [path: string]: (data: any) => void };
};

export type SocketDB = {
	update: (data: any) => void;
	get: (path: string) => any;
};

export function SocketDBServer({
	port = 8080,
	store = createStore(),
	updateInterval = 50,
	socketServer = createWebsocketServer({ port }),
}: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
} = {}): SocketDB {
	let subscriber: Subscribtions = {};

	let queuedUpdate: any;
	let pendingUpdate = null;

	function queueUpdate(diff: any) {
		if (pendingUpdate) {
			mergeDiff(diff, queuedUpdate);
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

	socketServer.onConnection((client, id) => {
		client.onDisconnect(() => {
			delete subscriber[id];
			delete subscriber[id + 'wildcard']; // this should be handled in a cleaner way
		});
		client.on('update', ({ data }) => {
			update(data);
		});
		client.on('subscribe', ({ path, once }) => {
			client.send(path, { data: store.get(path) });
			if (once) return;
			addSubscriber(id, path, (data) => {
				client.send(path, { data });
			});
		});
		client.on('unsubscribe', ({ path }) => {
			removeSubscriber(id, path);
		});
		client.on('subscribeKeys', ({ path }) => {
			const data = store.get(path);
			const wildcardPath = joinPath(path, '*');
			let keys = [];
			if (isObject(data)) {
				keys = Object.keys(data);
				client.send(wildcardPath, { data: keys });
			}
			addSubscriber(id + 'wildcard', path, (data) => {
				if (isObject(data)) {
					const newKeys = Object.keys(data).filter(
						(key) => !keys.includes(key)
					);
					if (newKeys.length > 0) client.send(wildcardPath, { data: newKeys });
					keys = [...keys, ...newKeys];
				}
			});
		});
	});
	return {
		update,
		get: (path: string) => {
			mergeDiff(store.get(path), {});
		},
	};
}
