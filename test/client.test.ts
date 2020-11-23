import { SocketDBClient } from '../src/client';
import { createStore } from '../src/store';
import { SocketClient } from '../src/socketAdapter/socketClient';
import { createEventBroker } from '../src/socketAdapter/eventBroker';

test('emits update object for path', (done) => {
	const socketClient: SocketClient = {
		off() {},
		on() {},
		send(event, { data }) {
			expect(event).toEqual('update');
			expect(data).toEqual({
				players: {
					1: {
						name: 'Patrick',
					},
				},
			});
			done();
		},
	};
	const client = SocketDBClient({ socketClient });

	client.get('players').get('1').get('name').set('Patrick');
});

test('merges data on update', (done) => {
	const store = createStore();

	const { addListener, notify } = createEventBroker();

	const socketClient: SocketClient = {
		off() {},
		on: addListener,
		send(event, { data }) {},
	};

	const client = SocketDBClient({ store, socketClient });

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
				done();
			}
			updateCount++;
		});

	notify('players/1', {
		data: {
			name: 'Peter',
			position: {
				x: 0,
				y: 1,
			},
		},
	});
	notify('players/1', {
		data: {
			position: {
				x: 1,
			},
		},
	});
});

test('can subscribe to path', (done) => {
	const { addListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off() {},
		on: addListener,
		send(event, { path, once }) {
			expect(event).toEqual('subscribe');
			expect(path).toBe('players/1');
			expect(once).not.toBe(true);
			notify('players/1', { data: { name: 'Thomas' } });
			notify('players/1', { data: { name: 'Thomas2' } });
		},
	};
	const client = SocketDBClient({ socketClient });

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
	let subscribeCount = 0;
	let unsubscribeCount = 0;

	const { addListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off() {},
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				subscribeCount++;
				setTimeout(() => {
					notify('players/1', { data: { name: 'Thomas' } });
					unsubscribe();
					notify('players/1', { data: { name: 'Thomas2' } });
				}, 10);
			} else if (event === 'unsubscribe') {
				unsubscribeCount++;
			}
		},
	};
	const client = SocketDBClient({ socketClient });

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
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				expect(path).toBe('players/1');
				notify('players/1', { data: 'test' });
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 0;
	client
		.get('players')
		.get('1')
		.once((data) => {
			expect(data).toEqual('test');
			client.get('players').get('1').set('-');
			updateCount++;
		});

	setTimeout(() => {
		expect(updateCount).toBe(1);
		done();
	}, 100);
});

test('can subscribe to keys of path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribeKeys') {
				expect(path).toBe('players');
				notify('players/*', { data: ['1', '2'] });
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	client.get('players').each((ref) => {
		expect(ref).toHaveProperty('get');
		done();
	});
});

test('can unsubscribe from keys of path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribeKeys') {
				expect(path).toBe('players');
				notify('players/*', { data: ['1'] });
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 0;
	const unsubscribe = client.get('players').each((ref) => {
		updateCount++;
		expect(ref).toHaveProperty('get');
	});
	setTimeout(() => {
		unsubscribe();
		notify('players/*', { data: ['2', '3'] });
		expect(updateCount).toBe(1);
		done();
	}, 100);
});

test('received data should not be passed as reference', (done) => {
	const store = createStore();
	const socketClient: SocketClient = {
		off() {},
		on() {},
		send() {},
	};
	const client = SocketDBClient({ socketClient, store });

	const testData = { test: '0' };

	client.get('data').once((data) => {
		expect(data).toEqual({ test: '0' });
		client.get('data').once((data2) => {
			expect(data === data2).toBe(false);
			expect(data2).toEqual({ test: '1' });
			done();
		});
		data.test = '1';
		client.get('data').set(data);
	});

	client.get('data').set(testData);
});

test('on/once always receives data on first call', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				notify('players/1', { data: { name: 'Thomas' } });
				client
					.get('players')
					.get('1')
					.on(() => {
						updateCount++;
						done();
					});
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
		});
});

test('only subscribes once for every root path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				subscribtionCount++;
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let subscribtionCount = 0;
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
		notify('players', { data: { 1: { name: 'Paul' } } });

		setTimeout(() => {
			expect(updateCount).toBe(4);
			done();
		}, 100);
	}, 100);
});

test('always subscribe to highest level path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				subscribtionCount++;
				if (subscribtionCount === 2) {
					expect(path).toBe('players');
				}
			} else if (event === 'unsubscribe') {
				unscubscribtionCount++;
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let subscribtionCount = 0;
	let unscubscribtionCount = 0;

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
	notify('players', {
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
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				subscribtionCount++;
			}
		},
	};
	const client = SocketDBClient({ socketClient });

	let subscribtionCount = 0;

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

	notify('players', { data: null });

	setTimeout(() => {
		expect(subscribtionCount).toBe(1);
		expect(updateCount).toBe(4);
		done();
	}, 500);
});

// TODO: should reconnect on connection lost
