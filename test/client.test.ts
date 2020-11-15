import { SocketDBClient } from '../src/client';
import MockedSocket from 'socket.io-mock';
import { createStore } from '../src/store';

test('emits update object for path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('update', ({ data }) => {
		expect(data).toEqual({
			players: {
				1: {
					name: 'Patrick',
				},
			},
		});
		done();
	});

	client.get('players').get('1').get('name').set('Patrick');
});

test('merges data on update', () => {
	const socket = new MockedSocket();
	const store = createStore();
	const client = SocketDBClient(socket.socketClient, { store });

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on((data) => {
			if (updateCount === 2) {
				expect(store.get('players/1')).toEqual({
					name: 'Peter',
					position: {
						x: 1,
						y: 1,
					},
				});
				expect(data).toEqual({
					name: 'Peter',
					position: {
						x: 1,
						y: 1,
					},
				});
			}
			updateCount++;
		});

	socket.emit('players/1', {
		data: {
			name: 'Peter',
			position: {
				x: 0,
				y: 1,
			},
		},
	});
	socket.emit('players/1', {
		data: {
			position: {
				x: 1,
			},
		},
	});
});

test('can subscribe to path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('subscribe', ({ path, once }) => {
		expect(path).toBe('players/1');
		expect(once).not.toBe(true);
		socket.emit('players/1', { data: { name: 'Thomas' } });
		socket.emit('players/1', { data: { name: 'Thomas2' } });
	});

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on((data) => {
			if (updateCount === 1) {
				expect(data).toEqual({ name: 'Thomas' });
				updateCount++;
			} else {
				expect(data).toEqual({ name: 'Thomas2' });
				done();
			}
		});
});

test('can unsubscribe from path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	let subscribeCount = 0;
	socket.on('subscribe', () => {
		subscribeCount++;
		setTimeout(() => {
			socket.emit('players/1', { data: { name: 'Thomas' } });
			unsubscribe();
			socket.emit('players/1', { data: { name: 'Thomas2' } });
		}, 10);
	});
	let unsubscribeCount = 0;
	socket.on('unsubscribe', () => {
		unsubscribeCount++;
	});

	let updateCount = 0;
	const unsubscribe = client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
		});
	setTimeout(() => {
		expect(subscribeCount).toBe(1);
		expect(unsubscribeCount).toBe(1);
		expect(updateCount).toBe(1);
		done();
	}, 100);
});

test('can subscribe to path once', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('subscribe', ({ path }) => {
		expect(path).toBe('players/1');
		socket.emit('players/1', { data: 'test' });
	});

	client
		.get('players')
		.get('1')
		.once((data) => {
			expect(data).toEqual('test');
			done();
		});
});

test('can subscribe to keys of path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('subscribeKeys', ({ path }) => {
		expect(path).toBe('players');
		socket.emit('players/*', { data: ['1', '2'] });
	});

	client.get('players').each((ref) => {
		expect(ref).toHaveProperty('get');
		done();
	});
});

test('can unsubscribe from keys of path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('subscribeKeys', ({ path }) => {
		expect(path).toBe('players');
		socket.emit('players/*', { data: ['1'] });
	});

	let updateCount = 0;
	const unsubscribe = client.get('players').each((ref) => {
		updateCount++;
		expect(ref).toHaveProperty('get');
	});
	setTimeout(() => {
		unsubscribe();
		socket.emit('players/*', { data: ['2', '3'] });
		expect(updateCount).toBe(1);
		done();
	}, 100);
});

test('on/once always receives data on first call', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	socket.on('subscribe', ({ path, once }) => {
		socket.emit('players/1', { data: { name: 'Thomas' } });
		client
			.get('players')
			.get('1')
			.on(() => {
				updateCount++;
				done();
			});
	});

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
		});
});

test('only subscribes once for every root path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	let subscribtionCount = 0;
	socket.on('subscribe', () => {
		subscribtionCount++;
	});

	let updateCount = 0;

	client.get('players').on(() => {
		updateCount++;
	});
	client.get('players').once(() => {
		updateCount++;
	});
	client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
		});
	client
		.get('players')
		.get('1')
		.get('name')
		.on(() => {
			updateCount++;
		});

	setTimeout(() => {
		expect(subscribtionCount).toBe(1);
		// we dont have data yet
		expect(updateCount).toBe(0);
		socket.emit('players', { data: { 1: { name: 'Paul' } } });
		setTimeout(() => {
			expect(updateCount).toBe(4);
			done();
		}, 100);
	}, 100);
});

test('always subscribe to highest level path', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	let subscribtionCount = 0;
	let unscubscribtionCount = 0;
	socket.on('subscribe', ({ path }) => {
		subscribtionCount++;
		if (subscribtionCount === 2) {
			expect(path).toBe('players');
		}
	});
	socket.on('unsubscribe', ({ path }) => {
		unscubscribtionCount++;
	});

	let updateReceivedCount = 0;
	client
		.get('players')
		.get('2')
		.on((data) => {
			expect(data).toBe(null);
			updateReceivedCount++;
		});
	client.get('players').on((data) => {
		expect(data).toEqual({
			1: {
				name: 'a',
			},
			2: null,
		});
		updateReceivedCount++;
	});
	socket.emit('players', {
		data: {
			1: {
				name: 'a',
			},
			2: null,
		},
	});
	client
		.get('players')
		.get('1')
		.get('name')
		.on((data) => {
			expect(data).toBe('a');
			updateReceivedCount++;
		});

	setTimeout(() => {
		expect(subscribtionCount).toBe(2);
		expect(unscubscribtionCount).toBe(1);
		expect(updateReceivedCount).toBe(3);
		done();
	}, 100);
});

test('if data is null, should notify every subpath', (done) => {
	const socket = new MockedSocket();
	const client = SocketDBClient(socket.socketClient);

	let subscribtionCount = 0;
	socket.on('subscribe', () => {
		subscribtionCount++;
	});

	let updateCount = 0;

	client.get('players').on(() => {
		updateCount++;
	});
	client.get('players').once(() => {
		updateCount++;
	});
	client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
		});
	client
		.get('players')
		.get('1')
		.get('name')
		.on(() => {
			updateCount++;
		});

	socket.emit('players', { data: null });

	setTimeout(() => {
		expect(subscribtionCount).toBe(1);
		expect(updateCount).toBe(4);
		done();
	}, 500);
});

// TODO: should reconnect on connection lost
