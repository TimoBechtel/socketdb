import { SocketDBServer } from '../src/server';
import MockedSocket from 'socket.io-mock';
import { createStore } from '../src/store';

test('updates data on manual update', () => {
	const store = createStore();
	const server = SocketDBServer({ on() {} } as any, { store });

	server.update({
		players: { 1: { name: 'Arnold' } },
	});

	expect(store.get('players/1/name')).toBe('Arnold');
});

test('updates data on socket request', () => {
	const socket = new MockedSocket();
	const store = createStore();
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') callback(socket);
			},
		} as any,
		{ store }
	);

	socket.socketClient.emit('update', {
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
	const socket = new MockedSocket();
	const store = createStore();
	store.put({
		players: {
			1: {
				name: 'Ralph',
			},
		},
	});

	let connect;
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);
	connect(socket);

	socket.socketClient.on('players/1', ({ data }) => {
		expect(data).toEqual({ name: 'Ralph' });
		done();
	});

	socket.socketClient.emit('subscribe', { path: 'players/1' });
});

test('emits updates to subscriber', async () => {
	const socket = new MockedSocket();
	socket.id = '123';
	const store = createStore();
	let connect;
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);
	connect(socket);

	await new Promise((resolve) => {
		let count = 1;
		socket.socketClient.on('players/1', ({ data }) => {
			if (count === 1) {
				expect(data).toBe(null);
				count++;
				setTimeout(() => {
					socket.socketClient.emit('update', {
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
				resolve();
			}
		});

		socket.socketClient.emit('subscribe', { path: 'players/1' });
	});
});

test('only emits changed values', (done) => {
	const socket = new MockedSocket();
	socket.id = '123';
	const store = createStore();
	store.put({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});

	let connect;
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);
	connect(socket);
	socket.socketClient.emit('subscribe', { path: 'players/1' });
	socket.socketClient.on('players/1', ({ data }) => {
		expect(data).toEqual({
			position: {
				x: 0,
				y: 1,
			},
		});
		done();
	});
	socket.socketClient.emit('update', {
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
	const socket1 = new MockedSocket();
	socket1.id = '1';
	const socket2 = new MockedSocket();
	socket2.id = '2';
	const store = createStore();
	store.put({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});
	let connect;
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);

	await new Promise((resolve) => {
		connect(socket1);
		socket1.socketClient.on('players', ({ data }) => {
			expect(data).toEqual({
				1: {
					name: 'Peter',
				},
			});
			resolve();
		});
		socket1.socketClient.emit('subscribe', { path: 'players', once: true });
	});
	await new Promise((resolve) => {
		connect(socket2);
		socket2.socketClient.on('players/1/name', ({ data }) => {
			expect(data).toEqual('Peter');
			resolve();
		});
		socket2.socketClient.emit('subscribe', { path: 'players/1/name' });
	});
});

test('sends keys when entries are added or removed', async () => {
	const socket = new MockedSocket();
	socket.id = '123';
	const store = createStore();
	let connect;
	const server = SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);
	connect(socket);

	server.update({
		players: {
			1: {
				name: 'Peter',
			},
		},
	});

	await new Promise((resolve) => {
		let count = 0;
		socket.socketClient.on('players/*', ({ data }) => {
			if (count === 0) {
				expect(data).toEqual(['1']);
				setTimeout(() => {
					socket.socketClient.emit('update', {
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
		});

		socket.socketClient.emit('subscribeKeys', { path: 'players', flat: true });
	});
});

test('only send data if client is subscribed', (done) => {
	const socket = new MockedSocket();
	socket.id = '123';
	const store = createStore();
	let connect;
	const server = SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{ store }
	);
	connect(socket);

	let receivedCount = 0;
	socket.socketClient.on('players/1', () => {
		receivedCount++;
	});
	socket.socketClient.emit('subscribe', { path: 'players/1' });
	socket.socketClient.emit('unsubscribe', { path: 'players/1' });
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
