import { createHooks, Hook } from './hooks';
import { Node, traverseNode } from './node';
import { Plugin } from './plugin';
import { SocketServer } from './socketAdapter/socketServer';
import { createWebsocketServer } from './socketAdapter/websocketServer';
import { createStore, Store } from './store';
import { createUpdateBatcher } from './updateBatcher';
import { deepClone, isObject, joinPath, mergeDiff } from './utils';

type Subscribtions = {
	[id: string]: { [path: string]: (data: any) => void };
};

export type SocketDB = {
	update: (data: Node) => void;
	get: (path: string) => Node;
};

export type ServerHooks = {
	'server:clientConnect'?: Hook<{ id: string }>;
	'server:clientDisconnect'?: Hook<{ id: string }>;
	'server:update'?: Hook<{ data: Node }>;
};

export type ServerPlugin = Plugin<ServerHooks>;

export function SocketDBServer({
	port = 8080,
	store = createStore(),
	updateInterval = 50,
	socketServer = createWebsocketServer({ port }),
	plugins = [],
}: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin[];
} = {}): SocketDB {
	let subscriber: Subscribtions = {};

	const queue = createUpdateBatcher(notifySubscibers, updateInterval);

	const hooks = createHooks<ServerHooks>();
	registerPlugins(plugins);

	function registerPlugins(plugins: ServerPlugin[]) {
		plugins.forEach((plugin) => {
			Object.entries(plugin.events).forEach(
				([name, hook]: [keyof ServerHooks, ServerHooks[keyof ServerHooks]]) => {
					hooks.register(name, hook);
				}
			);
		});
	}

	function update(data: Node) {
		let clonedData: Node = data;
		// deep clone only if we have hooks, store.put already does a deep clone
		if (hooks.count('server:update') > 0) {
			clonedData = deepClone(data);
		}
		hooks
			.call(
				'server:update',
				({ data }) => {
					const diff = store.put(data);
					queue(diff);
				},
				{ data: clonedData }
			)
			.catch((e) => {
				console.log(e);
			});
	}

	function notifySubscibers(diff: Node) {
		Object.values(subscriber).forEach((paths) => {
			traverseNode(diff, (path, data) => {
				if (!paths[path]) return;
				paths[path](data);
			});
		});
	}

	function addSubscriber(
		id: string,
		path: string,
		callback: (diff: Node) => void
	) {
		if (!subscriber[id]) subscriber[id] = {};
		subscriber[id][path] = callback;
	}

	function removeSubscriber(id: string, path: string) {
		if (subscriber[id]) {
			delete subscriber[id][path];
		}
	}

	socketServer.onConnection((client, id) => {
		hooks.call('server:clientConnect', null, { id });

		client.onDisconnect(() => {
			delete subscriber[id];
			delete subscriber[id + 'wildcard']; // this should be handled in a cleaner way
			hooks.call('server:clientDisconnect', null, { id });
		});
		client.on('update', ({ data }: { data: Node }) => {
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
			if (isObject(data.value)) {
				keys = Object.keys(data.value);
				client.send(wildcardPath, { data: keys });
			}
			addSubscriber(id + 'wildcard', path, (data: Node) => {
				if (isObject(data.value)) {
					const newKeys = Object.keys(data.value).filter(
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
		get: (path: string): Node => {
			return deepClone(store.get(path));
		},
	};
}