import { createEventBroker } from '../src/socketAdapter/eventBroker';
import { SocketClient } from '../src/socketAdapter/socketClient';
import { SocketServer } from '../src/socketAdapter/socketServer';
import { SocketDBServer } from '../src/server';
import { createStore } from '../src/store';

test('updates data on manual update', () => {
	const store = createStore();
	const server = SocketDBServer({
		store,
		socketServer: {
			onConnection() {},
		},
	});

	server.update({
		players: { 1: { name: 'Arnold' } },
	});

	expect(store.get('players/1/name')).toBe('Arnold');
});

test('updates data on socket request', () => {
	const store = createStore();
	let connect: (client: SocketClient, id: string) => void;
	const { addListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	connect(
		{
			on: addListener,
			off() {},
			send() {},
		},
		'1'
	);

	notify('update', {
		data: {
			players: {
				1: {
					name: 'Peter',
				},
			},
		},
	});

	expect(store.get('players/1/name')).toBe('Peter');
});

test('sends data on first subscribe', (done) => {
	const store = createStore();
	store.put({
		players: {
			1: {
				name: 'Ralph',
			},
		},
	});

	let connect: (client: SocketClient, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });
	connect(
		{
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					expect(data).toEqual({ name: 'Ralph' });
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
	let connect: (client: SocketClient, id: string) => void;
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
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					if (count === 1) {
						expect(data).toBe(null);
						count++;
						setTimeout(() => {
							notify('update', {
								data: {
									players: {
										1: {
											name: 'Peter',
										},
									},
								},
							});
							expect(store.get('players/1/name')).toBe('Peter');
						}, 100);
					} else {
						expect(data).toEqual({ name: 'Peter' });
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
	store.put({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});

	let connect: (client: SocketClient, id: string) => void;
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
			on: addListener,
			off: removeListener,
			send(event, { data }) {
				if (event === 'players/1') {
					if (updateCount === 0) {
						updateCount++;
						expect(data).toEqual({ name: 'Peter' });
					} else {
						expect(data).toEqual({
							position: {
								x: 0,
								y: 1,
							},
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
			players: {
				1: {
					name: 'Peter',
					position: {
						x: 0,
						y: 1,
					},
				},
			},
		},
	});
});

test('emits updates to all subscribers', async () => {
	const store = createStore();
	store.put({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});
	let connect: (client: SocketClient, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ store, socketServer });

	await new Promise((resolve) => {
		const { addListener, removeListener, notify } = createEventBroker();
		connect(
			{
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players') {
						expect(data).toEqual({
							1: {
								name: 'Peter',
							},
						});
						resolve();
					}
				},
			},
			'1'
		);
		notify('subscribe', { path: 'players', once: true });
	});
	await new Promise((resolve) => {
		const { addListener, removeListener, notify } = createEventBroker();
		connect(
			{
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players/1/name') {
						expect(data).toEqual('Peter');
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
	let connect: (client: SocketClient, id: string) => void;
	const { addListener, removeListener, notify } = createEventBroker();

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	const server = SocketDBServer({ store, socketServer });

	server.update({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});

	await new Promise((resolve) => {
		let count = 0;
		connect(
			{
				on: addListener,
				off: removeListener,
				send(event, { data }) {
					if (event === 'players/*') {
						if (count === 0) {
							expect(data).toEqual(['1']);
							setTimeout(() => {
								notify('update', {
									data: {
										players: {
											1: {
												name: 'Peter',
											},
											2: {
												name: 'Parker',
											},
										},
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
	let connect: (client: SocketClient, id: string) => void;
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
	server.update({
		players: {
			1: {
				name: 'Hans',
			},
		},
	});
	setTimeout(() => {
		expect(receivedCount).toBe(1);
		done();
	}, 100);
});

// TODO: should not notify socket about own update
