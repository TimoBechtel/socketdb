import { createEventBroker } from '../src/socketAdapter/eventBroker';
import { SocketServer } from '../src/socketAdapter/socketServer';
import { SocketDBServer } from '../src/server';
import { createStore } from '../src/store';
import { Socket } from '../src/socketAdapter/socket';
import { nodeify } from '../src/node';
import { BatchedUpdate } from '../src/updateBatcher';

test('updates data on manual update', () => {
	const store = createStore();
	const server = SocketDBServer({
		store,
		socketServer: {
			onConnection() {},
		},
	});

	server.update(
		nodeify({
			players: { 1: { name: 'Arnold' } },
		})
	);

	expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
});

test('updates data on socket request', () => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	connect(
		{
			onDisconnect() {},
			on: addListener,
			off() {},
			send() {},
		},
		'1'
	);
	notify('update', {
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

	expect(store.get('players/1/name')).toEqual({ value: 'Peter' });
});

test('deletes data on socket request', () => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	connect(
		{
			onDisconnect() {},
			on: addListener,
			off() {},
			send() {},
		},
		'1'
	);
	notify('update', {
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
	expect(store.get('players/1')).toEqual(nodeify({ x: 0, y: 1 }));
	notify('update', {
		data: {
			delete: ['players/1'],
		},
	});

	expect(store.get('players/')).toEqual(nodeify({}));
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

	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });
	connect(
		{
			onDisconnect() {},
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					expect(data).toEqual({ change: nodeify({ name: 'Ralph' }) });
					done();
				}
			},
		},
		'1'
	);

	notify('subscribe', { path: 'players/1' });
});

test('emits updates to subscriber', (done) => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	let count = 1;
	connect(
		{
			onDisconnect() {},
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					if (count === 1) {
						expect(data).toEqual({ change: nodeify(null) });
						count++;
						setTimeout(() => {
							notify('update', {
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
							expect(store.get('players/1/name')).toEqual(nodeify('Peter'));
						}, 100);
					} else {
						expect(data).toEqual<BatchedUpdate>({
							change: nodeify({ name: 'Peter' }),
						});
						done();
					}
				}
			},
		},
		'1'
	);

	notify('subscribe', { path: 'players/1' });
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

	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	let updateCount = 0;
	connect(
		{
			onDisconnect() {},
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
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
		},
		'1'
	);

	notify('subscribe', { path: 'players/1' });
	notify('update', {
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
	let connect: (client: Socket, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	await new Promise<void>((resolve) => {
		const { addListener, removeListener, notify } = createEventBroker();
		connect(
			{
				onDisconnect() {},
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players') {
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
			},
			'1'
		);
		notify('subscribe', { path: 'players', once: true });
	});
	await new Promise<void>((resolve) => {
		const { addListener, removeListener, notify } = createEventBroker();
		connect(
			{
				onDisconnect() {},
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players/1/name') {
						expect(data).toEqual({ change: nodeify('Peter') });
						resolve();
					}
				},
			},
			'2'
		);
		notify('subscribe', { path: 'players/1/name' });
	});
});

test('sends keys when entries are added or removed', async () => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	const server = SocketDBServer({ store, socketServer });

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
		connect(
			{
				onDisconnect() {},
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players/*') {
						if (count === 0) {
							expect(data).toEqual(['1']);
							setTimeout(() => {
								notify('update', {
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
							}, 100);
						}
						if (count === 1) {
							expect(data).toEqual(['2']);
							resolve();
						}
						count++;
					}
				},
			},
			'1'
		);
		notify('subscribeKeys', { path: 'players', flat: true });
	});
});

test('only send data if client is subscribed', (done) => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	const server = SocketDBServer({ store, socketServer });

	let receivedCount = 0;
	connect(
		{
			onDisconnect() {},
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					receivedCount++;
				}
			},
		},
		'1'
	);

	notify('subscribe', { path: 'players/1' });
	notify('unsubscribe', { path: 'players/1' });
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
	}, 100);
});

test('should batch updates', (done) => {
	const store = createStore();
	let connect: (client: Socket, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer, updateInterval: 10 });

	let receivedCount = 0;
	connect(
		{
			onDisconnect() {},
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (receivedCount === 0) {
					expect(data).toEqual({ change: nodeify(null) });
				}
				if (receivedCount === 1) {
					expect(data).toEqual({ change: nodeify('b'), delete: ['player/a'] });
				}
				receivedCount++;
			},
		},
		'1'
	);

	notify('subscribe', { path: 'player' });

	notify('update', { data: { change: nodeify({ player: 'a' }) } });
	notify('update', { data: { change: nodeify({ player: 'b' }) } });
	notify('update', { data: { delete: ['player/a'] } });

	setTimeout(() => {
		// first: null, second: 'b'
		expect(receivedCount).toBe(2);
		expect(store.get()).toEqual(nodeify({ player: 'b' }));
		done();
	}, 50);
});
