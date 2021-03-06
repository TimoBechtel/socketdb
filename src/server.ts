import { createHooks, Hook } from './hooks';
import { Node, traverseNode } from './node';
import { BatchedUpdate, createUpdateBatcher } from './updateBatcher';
import { Plugin } from './plugin';
import { SocketServer } from './socketAdapter/socketServer';
import { createWebsocketServer } from './socketAdapter/websocketServer';
import { createStore, Store } from './store';
import { deepClone, isObject } from './utils';
import { joinPath } from './path';

type Subscriptions = {
	[id: string]: { [path: string]: (data: BatchedUpdate) => void };
};

export type SocketDBServerAPI = {
	update: (data: Node) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
};

/**
 * Deprecated. Use SocketDBServerAPI instead.
 * Type alias will be removed in a future update.
 */
export type SocketDB = SocketDBServerAPI;

export type ServerHooks = {
	'server:clientConnect'?: Hook<{ id: string }, { client: { id: string } }>;
	'server:clientDisconnect'?: Hook<{ id: string }, { client: { id: string } }>;
	'server:update'?: Hook<{ data: Node }, { client: { id: string } }>;
	'server:delete'?: Hook<{ path: string }, { client: { id: string } }>;
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
} = {}): SocketDBServerAPI {
	let subscriber: Subscriptions = {};

	const queue = createUpdateBatcher(notifySubscribers, updateInterval);

	const hooks = createHooks<ServerHooks>();
	registerPlugins(plugins);

	function registerPlugins(plugins: ServerPlugin[]) {
		plugins.forEach((plugin) => {
			Object.entries(plugin.hooks).forEach(
				([name, hook]: [keyof ServerHooks, ServerHooks[keyof ServerHooks]]) => {
					hooks.register(name, hook);
				}
			);
		});
	}

	function update(data: Node, id: string = null) {
		hooks
			.call('server:update', { args: { data }, context: { client: { id } } })
			.then(({ data }) => {
				const diff = store.put(data);
				queue({ type: 'change', data: diff });
			})
			.catch(console.log);
	}

	function del(path: string, id: string = null) {
		hooks
			.call(
				'server:delete',
				{ args: { path }, context: { client: { id } } },
				{ asRef: true }
			)
			.then(({ path }) => {
				store.del(path);
				queue({ type: 'delete', path });
			})
			.catch(console.log);
	}

	function notifySubscribers(diff: BatchedUpdate) {
		if (!diff.change && !diff.delete) return;
		Object.values(subscriber).forEach((subscription) => {
			Object.entries(subscription).forEach(([subscribedPath, callback]) => {
				let update: BatchedUpdate = {};
				const deletePaths: string[] = diff.delete?.filter(
					(path) =>
						path.startsWith(subscribedPath) || subscribedPath.startsWith(path)
				);
				if (deletePaths && deletePaths.length > 0) update.delete = deletePaths;
				if (diff.change) {
					traverseNode(diff.change, (path, data) => {
						if (subscribedPath === path) {
							update.change = data;
							return true;
						}
					});
				}
				if (update.change || update.delete) callback(update);
			});
		});
	}

	function addSubscriber(
		id: string,
		path: string,
		callback: (diff: BatchedUpdate) => void
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
		hooks.call(
			'server:clientConnect',
			{
				args: { id },
				context: { client: { id } },
			},
			{ asRef: true }
		);

		client.onDisconnect(() => {
			delete subscriber[id];
			delete subscriber[id + 'wildcard']; // this should be handled in a cleaner way
			hooks.call(
				'server:clientDisconnect',
				{ args: { id }, context: { client: { id } } },
				{ asRef: true }
			);
		});
		client.on('update', ({ data }: { data: BatchedUpdate }) => {
			data.delete?.forEach((path) => del(path, id));
			if (data.change) update(data.change, id);
		});
		client.on('subscribe', ({ path, once }) => {
			client.send(path, { data: { change: store.get(path) } });
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
			addSubscriber(id + 'wildcard', path, (data: BatchedUpdate) => {
				if (data.change && isObject(data.change.value)) {
					const newKeys = Object.keys(data.change.value).filter(
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
		delete: del,
	};
}
