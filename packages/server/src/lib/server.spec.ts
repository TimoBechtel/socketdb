/* eslint-disable @typescript-eslint/no-empty-function */
import {
	DATA_CONTEXT,
	SOCKET_EVENTS,
	createStore,
	nodeify,
	type BatchedUpdate,
} from '@socketdb/core';
import { SocketDBServer } from './server';
import { mockSocketServer } from './socket-implementation/mockServer';

test('updates data on manual update', () => {
	const store = createStore();
	const server = SocketDBServer({
		store,
		socketServer: {
			listen() {},
			onConnection() {},
		},
	});
	server.listen();

	server.update(
		nodeify({
			players: { 1: { name: 'Arnold' } },
		})
	);
	// update will call hooks asynchronously so, we need a little delay here:
	setTimeout(() => {
		expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
	});
});

test('updates data on socket request', () => {
	const store = createStore();

	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer }).listen();

	const { notify } = connectClient();
	notify(SOCKET_EVENTS.data.clientUpdate, {
		data: {
			change: nodeify({
				players: {
					1: {
						name: 'Peter',
					},
				},
			}),
			delete: [],
		},
	});

	setTimeout(() => {
		expect(store.get('players/1/name')).toEqual({ value: 'Peter' });
	});
});

test('deletes data on socket request', (done) => {
	const store = createStore();

	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer }).listen();

	const { notify } = connectClient();
	notify(SOCKET_EVENTS.data.clientUpdate, {
		data: {
			change: nodeify({
				players: {
					1: {
						x: 0,
						y: 1,
					},
				},
			}),
		},
	});
	setTimeout(() => {
		expect(store.get('players/1')).toEqual(nodeify({ x: 0, y: 1 }));
		notify(SOCKET_EVENTS.data.clientUpdate, {
			data: {
				delete: ['players/1'],
			},
		});

		setTimeout(() => {
			expect(store.get('players/')).toEqual(nodeify({}));
			done();
		});
	});
});

test('sends data on first subscribe', (done) => {
	const store = createStore();
	store.put(
		nodeify({
			players: {
				1: {
					name: 'Ralph',
				},
			},
		})
	);

	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer }).listen();

	const { notify } = connectClient({
		id: '1',
		onSend(event, { data }) {
			if (event === `${DATA_CONTEXT}:players/1`) {
				expect(data).toEqual({ change: nodeify({ name: 'Ralph' }) });
				done();
			}
		},
	});

	notify(SOCKET_EVENTS.data.requestSubscription, { path: 'players/1' });
});

test('emits updates to subscriber', (done) => {
	const store = createStore();
	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer, updateInterval: 5 }).listen();

	let count = 1;
	const { notify } = connectClient({
		onSend(event, { data }) {
			if (event === `${DATA_CONTEXT}:players/1`) {
				if (count === 1) {
					expect(data).toEqual({ change: nodeify(null) });
					count++;
					setTimeout(() => {
						notify(SOCKET_EVENTS.data.clientUpdate, {
							data: {
								change: nodeify({
									players: {
										1: {
											name: 'Peter',
										},
									},
								}),
								delete: [],
							},
						});
						setTimeout(() => {
							expect(store.get('players/1/name')).toEqual(nodeify('Peter'));
						});
					}, 25);
				} else {
					expect(data).toEqual<BatchedUpdate>({
						change: nodeify({ name: 'Peter' }),
					});
					done();
				}
			}
		},
	});

	notify(SOCKET_EVENTS.data.requestSubscription, { path: 'players/1' });
});

test('only emits changed values', (done) => {
	const store = createStore();
	store.put(
		nodeify({
			players: {
				1: {
					name: 'Peter',
				},
			},
		})
	);

	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer }).listen();

	let updateCount = 0;

	const { notify } = connectClient({
		onSend(event, { data }) {
			if (event === `${DATA_CONTEXT}:players/1`) {
				if (updateCount === 0) {
					updateCount++;
					expect(data).toEqual({ change: nodeify({ name: 'Peter' }) });
				} else {
					expect(data).toEqual({
						change: nodeify({
							position: {
								x: 0,
								y: 1,
							},
						}),
					});
					done();
				}
			}
		},
	});

	notify(SOCKET_EVENTS.data.requestSubscription, { path: 'players/1' });
	notify(SOCKET_EVENTS.data.clientUpdate, {
		data: {
			change: nodeify({
				players: {
					1: {
						name: 'Peter',
						position: {
							x: 0,
							y: 1,
						},
					},
				},
			}),
			delete: [],
		},
	});
});

test('emits updates to all subscribers', async () => {
	const store = createStore();
	store.put(
		nodeify({
			players: {
				1: {
					name: 'Peter',
				},
			},
		})
	);
	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer }).listen();

	await new Promise<void>((resolve) => {
		const { notify } = connectClient({
			onSend(event, { data }) {
				if (event === `${DATA_CONTEXT}:players`) {
					expect(data).toEqual({
						change: nodeify({
							1: {
								name: 'Peter',
							},
						}),
					});
					resolve();
				}
			},
		});
		notify(SOCKET_EVENTS.data.requestSubscription, {
			path: 'players',
			once: true,
		});
	});
	await new Promise<void>((resolve) => {
		const { notify } = connectClient({
			onSend(event, { data }) {
				if (event === `${DATA_CONTEXT}:players/1/name`) {
					expect(data).toEqual({ change: nodeify('Peter') });
					resolve();
				}
			},
		});
		notify(SOCKET_EVENTS.data.requestSubscription, { path: 'players/1/name' });
	});
});

test('sends keys when entries are added or removed', async () => {
	const store = createStore();

	const { socketServer, connectClient } = mockSocketServer();

	const server = SocketDBServer({ store, socketServer, updateInterval: 5 });
	server.listen();

	server.update(
		nodeify({
			players: {
				1: {
					name: 'Peter',
				},
			},
		})
	);

	await new Promise<void>((resolve) => {
		let count = 0;
		const { notify } = connectClient({
			onSend(event, { data }) {
				if (event === `${DATA_CONTEXT}:players/*`) {
					if (count === 0) {
						expect(data).toEqual({ added: ['1'] });
						setTimeout(() => {
							notify(SOCKET_EVENTS.data.clientUpdate, {
								data: {
									change: nodeify({
										players: {
											1: {
												name: 'Peter',
											},
											2: {
												name: 'Parker',
											},
										},
									}),
								},
							});
						}, 25);
					}
					if (count === 1) {
						expect(data).toEqual({ added: ['2'] });
						resolve();
					}
					count++;
				}
			},
		});
		notify(SOCKET_EVENTS.data.requestKeysSubscription, {
			path: 'players',
			flat: true,
		});
	});
});

test('only send data if client is subscribed', (done) => {
	const store = createStore();

	const { socketServer, connectClient } = mockSocketServer();

	const server = SocketDBServer({ store, socketServer, updateInterval: 10 });
	server.listen();

	let receivedCount = 0;

	const { notify } = connectClient({
		onSend(event, { data }) {
			if (event === `${DATA_CONTEXT}:players/1`) {
				receivedCount++;
			}
		},
	});

	notify(SOCKET_EVENTS.data.requestSubscription, { path: 'players/1' });
	notify(SOCKET_EVENTS.data.requestUnsubscription, { path: 'players/1' });
	server.update(
		nodeify({
			players: {
				1: {
					name: 'Hans',
				},
			},
		})
	);
	setTimeout(() => {
		expect(receivedCount).toBe(1);
		done();
	}, 50);
});

test('should batch updates', (done) => {
	const store = createStore();

	const { socketServer, connectClient } = mockSocketServer();

	SocketDBServer({ store, socketServer, updateInterval: 10 }).listen();

	let receivedCount = 0;

	const { notify } = connectClient({
		onSend(_, { data }) {
			if (receivedCount === 0) {
				expect(data).toEqual({ change: nodeify(null) });
			}
			if (receivedCount === 1) {
				expect(data).toEqual({ change: nodeify('b'), delete: ['player/a'] });
			}
			receivedCount++;
		},
	});

	notify(SOCKET_EVENTS.data.requestSubscription, { path: 'player' });

	notify(SOCKET_EVENTS.data.clientUpdate, {
		data: { change: nodeify({ player: 'a' }) },
	});
	notify(SOCKET_EVENTS.data.clientUpdate, {
		data: { change: nodeify({ player: 'b' }) },
	});
	notify(SOCKET_EVENTS.data.clientUpdate, { data: { delete: ['player/a'] } });

	setTimeout(() => {
		// first: null, second: 'b'
		expect(receivedCount).toBe(2);
		expect(store.get()).toEqual(nodeify({ player: 'b' }));
		done();
	}, 50);
});

test('allows adding a custom user context', (done) => {
	const store = createStore();
	SocketDBServer({
		store,
		socketServer: {
			onConnection(callback) {
				callback(
					{
						onDisconnect() {},
						on() {},
						off() {},
						send() {},
						close() {},
					},
					'1',
					{ username: 'Peter' }
				);
			},
			listen() {},
		},
		plugins: [
			{
				name: 'username',
				hooks: {
					'server:clientConnect': (_, { client }) => {
						expect(client.context).toEqual({ username: 'Peter' });
						done();
					},
				},
			},
		],
	}).listen();
});

test('allows getting the user context', () => {
	const { socketServer, connectClient } = mockSocketServer({
		initializeSession() {
			return {
				username: 'Peter',
			};
		},
	});

	const server = SocketDBServer({ socketServer });

	server.listen();

	const { disconnect } = connectClient({
		id: '1',
	});

	// get client by id
	expect(server.getClient('1')).not.toBeNull();
	expect(server.getClient('2')).toBeNull();
	// get client using a filter
	expect(server.getClient((c) => c['username'] === 'Peter')).not.toBeNull();

	// get all clients
	expect(server.getClients()).toHaveLength(1);
	// get all clients using a filter
	expect(server.getClients((c) => c['username'] === 'Peter')).toHaveLength(1);

	disconnect();

	expect(server.getClient('1')).toBeNull();
	expect(server.getClients()).toHaveLength(0);
});
