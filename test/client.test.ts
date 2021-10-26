import { SocketDBClient } from '../src/client';
import { nodeify } from '../src/node';
import { createEventBroker } from '../src/socketAdapter/eventBroker';
import { SocketClient } from '../src/socketAdapter/socketClient';
import { createStore } from '../src/store';
import { BatchedUpdate } from '../src/updateBatcher';

test('throws error when using * as pathname', () => {
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send() {},
		close() {},
	};
	type Schema = {
		players: { [key: string]: { name: string } };
	};
	const client = SocketDBClient<Schema>({ socketClient });

	expect(() => client.get('players').get('1*').get('name')).toThrowError();
});

test('emits update object for path', (done) => {
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send(event, { data }) {
			expect(event).toEqual('update');
			expect(data).toEqual({
				change: nodeify({
					players: {
						1: {
							name: 'Patrick',
						},
					},
				}),
			});
			done();
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	client.get('players').get('1').get('name').set('Patrick');
});

test('deletes data and notifies local subscribers', (done) => {
	const store = createStore();
	const { addListener, removeListener, notify } = createEventBroker();

	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { data }: { data: BatchedUpdate }) {
			if (event === 'update') {
				if (data.change) {
					expect(data.change).toEqual(
						nodeify({
							players: {
								1: {
									name: 'Patrick',
								},
							},
						})
					);
					notify('players/1/name', {
						data: {
							change: nodeify('Patrick'),
						},
					});
				} else {
					notify('players/1/name', {
						data: {
							delete: data.delete,
						},
					});
				}
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient, store, updateInterval: 5 });

	let updateCount = 0;
	client
		.get('players')
		.get('1')
		.get('name')
		.on((data) => {
			if (updateCount === 0) {
				expect(data).toEqual('Patrick');
			} else if (updateCount === 1) {
				expect(data).toEqual(null);
				expect(store.get('players/1')).toEqual(nodeify(null));
				setTimeout(done, 100);
			}
			updateCount++;
		});

	client.get('players').get('1').get('name').set('Patrick');
	// timeout to make sure, updates are not batched
	setTimeout(() => {
		expect(store.get('players/1')).toEqual(nodeify({ name: 'Patrick' }));
		client.get('players').get('1').delete();
	}, 10);
});

test('should batch updates', (done) => {
	type Schema = {
		players: { [key: string]: { name: string; hp: number } };
	};

	let sendCount = 0;
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send(event, { data }) {
			expect(event).toEqual('update');
			expect(data).toEqual({
				change: nodeify({
					players: {
						1: {
							name: 'Star',
							hp: 100,
						},
					},
				}),
				delete: ['players/1/name'],
			});
			sendCount++;
		},
		close() {},
	};
	const client = SocketDBClient<Schema>({ socketClient, updateInterval: 10 });

	client.get('players').get('1').get('name').set('Patrick');
	client.get('players').get('1').get('name').delete();
	client.get('players').get('1').get('name').set('Star');
	client.get('players').get('1').get('hp').set(100);

	setTimeout(() => {
		expect(sendCount).toBe(1);
		done();
	}, 50);
});

test('merges data on update', (done) => {
	const store = createStore();

	const { addListener, notify } = createEventBroker();

	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on: addListener,
		send(event, { data }) {},
		close() {},
	};

	const client = SocketDBClient({ store, socketClient });

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on((data) => {
			if (updateCount === 2) {
				expect(store.get('players/1')).toEqual(
					nodeify({
						name: 'Peter',
						position: {
							x: 1,
							y: 1,
						},
					})
				);
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
			change: nodeify({
				name: 'Peter',
				position: {
					x: 0,
					y: 1,
				},
			}),
		},
	});
	notify('players/1', {
		data: {
			change: nodeify({
				position: {
					x: 1,
				},
			}),
		},
	});
});

test('can subscribe to path', (done) => {
	const { addListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on: addListener,
		send(event, { path, once }) {
			expect(event).toEqual('subscribe');
			expect(path).toBe('players/1');
			expect(once).not.toBe(true);
			notify('players/1', { data: { change: nodeify({ name: 'Thomas' }) } });
			notify('players/1', { data: { change: nodeify({ name: 'Thomas2' }) } });
			notify('players/1', { data: { delete: ['players/1'] } });
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 0;

	client
		.get('players')
		.get('1')
		.on((data) => {
			if (updateCount === 0) {
				expect(data).toEqual({ name: 'Thomas' });
			} else if (updateCount === 1) {
				expect(data).toEqual({ name: 'Thomas2' });
			} else {
				expect(data).toEqual(null);
				done();
			}
			updateCount++;
		});
});

test('can unsubscribe from path', (done) => {
	let subscribeCount = 0;
	let unsubscribeCount = 0;

	const { addListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				subscribeCount++;
				setTimeout(() => {
					notify('players/1', {
						data: { change: nodeify({ name: 'Thomas' }) },
					});
					unsubscribe();
					notify('players/1', {
						data: { change: nodeify({ name: 'Thomas2' }) },
					});
				}, 10);
			} else if (event === 'unsubscribe') {
				unsubscribeCount++;
			}
		},
		close() {},
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
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				expect(path).toBe('players/1');
				notify('players/1', { data: { change: nodeify('test') } });
			}
		},
		close() {},
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

test('unsubscribing does not cancel other subscriptions', (done) => {
	// see: https://github.com/TimoBechtel/socketdb/issues/20
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { data }) {
			if (event === 'update') {
				expect(data).toEqual({
					change: nodeify({ path: 'test' }),
				});
				notify('path', { data: { change: nodeify('test') } });
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 0;

	const unsubscribe = client.get('path').on(() => {
		updateCount++;
		unsubscribe();
	});
	client.get('path').on(() => {
		updateCount++;
	});

	client.get('path').set('test');

	setTimeout(() => {
		// both once subscriptions should be called once
		expect(updateCount).toBe(2);
		done();
	}, 100);
});

test('can subscribe to keys of path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribeKeys') {
				expect(path).toBe('players');
				notify('players/*', { data: ['1', '2'] });
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let keysCount = 0;
	client.get('players').each((ref, key) => {
		expect(ref).toHaveProperty('get');
		if (keysCount === 0) {
			expect(key).toBe('1');
		} else {
			expect(key).toBe('2');
			done();
		}
		keysCount++;
	});
});

test('can unsubscribe from keys of path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribeKeys') {
				expect(path).toBe('players');
				notify('players/*', { data: ['1'] });
			}
		},
		close() {},
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
	const { addListener, removeListener, notify } = createEventBroker();
	const store = createStore();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { data }) {
			if (event === 'update') {
				notify('data', { data: { change: data.change.value.data } });
			}
		},
		close() {},
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

test('also receives metadata', (done) => {
	const metaExample = { owner: 'Thomas' };
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				notify('players/1', {
					data: { change: { meta: metaExample, value: 'Thomas' } },
				});
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	client
		.get('players')
		.get('1')
		.on((_, meta) => {
			expect(meta).toEqual(metaExample);
			done();
		});
});

test('allows setting metadata', (done) => {
	type Schema = {
		players: {
			[key: string]: string;
		};
	};

	const metaExample = { owner: 'Thomas' };
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send(_, { data }) {
			expect(data.change.value.players.value[1]).toEqual({
				value: 'b',
				meta: metaExample,
			});
			done();
		},
		close() {},
	};
	const client = SocketDBClient<Schema>({ socketClient });
	client.get('players').get('1').set('b', metaExample);
});

test('on/once always receives data on first call', (done) => {
	const { addListener, removeListener, notify } =
		createEventBroker<{ data: BatchedUpdate }>();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				notify('players/1', { data: { change: nodeify({ name: 'Thomas' }) } });
				client
					.get('players')
					.get('1')
					.on(() => {
						updateCount++;
						expect(updateCount).toBe(2);
						done();
					});
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let updateCount = 0;
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
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event) {
			if (event === 'subscribe') {
				subscriptionCount++;
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let subscriptionCount = 0;
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
		expect(subscriptionCount).toBe(1);
		// we don't have data yet
		expect(updateCount).toBe(0);
		notify('players', { data: { change: nodeify({ 1: { name: 'Paul' } }) } });

		setTimeout(() => {
			expect(updateCount).toBe(4);
			done();
		}, 100);
	}, 100);
});

test('always subscribe to highest level path', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				subscriptionCount++;
				if (subscriptionCount === 2) {
					expect(path).toBe('players');
				}
			} else if (event === 'unsubscribe') {
				unsubscriptionCount++;
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let subscriptionCount = 0;
	let unsubscriptionCount = 0;

	let updateReceivedCount = 0;

	/**
	 * should subscribe to /players/2
	 * subscriptionCount = 1
	 */
	client
		.get('players')
		.get('2')
		.on((data) => {
			expect(data).toBe(null);
			updateReceivedCount++;
		});

	/**
	 * should unsubscribe from /players/2
	 * unsubscriptionCount = 1
	 * should subscribe to /players
	 * subscriptionCount = 2
	 */
	const unsubscribePlayers = client.get('players').on((data) => {
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
			change: nodeify({
				1: {
					name: 'a',
				},
				2: null,
			}),
		},
	});

	/**
	 * should not subscribe to anything,
	 * as there is already /players subscribed
	 * unsubscriptionCount = 1
	 * subscriptionCount = 2
	 */
	client
		.get('players')
		.get('1')
		.get('name')
		.on((data) => {
			expect(data).toBe('a');
			updateReceivedCount++;
		});

	/**
	 * should unsubscribe from /players
	 * unsubscriptionCount = 2
	 * should subscribe to /players/2
	 * should subscribe to /players/1/name
	 * subscriptionCount = 4
	 */
	unsubscribePlayers();

	/**
	 * should unsubscribe from /players/2
	 * should unsubscribe from /players/1/name
	 * unsubscriptionCount = 4
	 * should subscribe to /players
	 * subscriptionCount = 5
	 */
	client.get('players').on(() => {});

	setTimeout(() => {
		expect(unsubscriptionCount).toBe(4);
		expect(subscriptionCount).toBe(5);
		expect(updateReceivedCount).toBe(3);
		done();
	}, 100);
});

test('does not resubscribe to keys if higher level path is already subscribed', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribeKeys') {
				fail('should not subscribe to keys');
			}
			if (event === 'subscribe') {
				expect(path).toBe('players');
				// simulate coming from server + make sure, "each" is called before
				// checks if each will receive updates coming from server
				setTimeout(() => {
					notify('players', {
						data: { change: nodeify({ 1: 'test1', 2: 'test2' }) },
					});
				}, 10);
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let keysCount = 0;
	client.get('players').on(() => {});
	client.get('players').each((ref, key) => {
		expect(ref).toHaveProperty('get');
		if (keysCount === 0) {
			expect(key).toBe('1');
		} else {
			expect(key).toBe('2');
			done();
		}
		keysCount++;
	});
});

test('if data is null, should notify every subpath', (done) => {
	const { addListener, removeListener, notify } = createEventBroker();
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: removeListener,
		on: addListener,
		send(event, { path }) {
			if (event === 'subscribe') {
				subscriptionCount++;
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });

	let subscriptionCount = 0;

	let updateCount = 0;

	let testString = '';
	client.get('players').on(() => {
		updateCount++;
		testString += 'a';
	});
	client.get('players').once(() => {
		updateCount++;
		testString += 'b';
	});
	client
		.get('players')
		.get('1')
		.on(() => {
			updateCount++;
			testString += 'c';
		});
	client
		.get('players')
		.get('1')
		.get('name')
		.on(() => {
			updateCount++;
			testString += 'd';
		});

	notify('players', { data: { change: nodeify(null) } });

	setTimeout(() => {
		expect(subscriptionCount).toBe(1);
		expect(testString).toBe('abcd');
		expect(updateCount).toBe(4);
		done();
	}, 500);
});

test('subscribes again after reconnect', (done) => {
	const { addListener, notify } = createEventBroker<{ data: BatchedUpdate }>();
	let subscribeCount = 0;

	let connect: () => void, disconnect: () => void;
	const socketClient: SocketClient = {
		onConnect(callback) {
			connect = callback;
		},
		onDisconnect(callback) {
			disconnect = callback;
		},
		off() {},
		on: addListener,
		send(event, { path, once }) {
			subscribeCount++;
			expect(event).toEqual('subscribe');
			expect(path).toBe('players/1');
			expect(once).not.toBe(true);
			if (subscribeCount === 1) {
				notify('players/1', { data: { change: nodeify({ name: 'Thomas' }) } });
				disconnect();
				connect();
			} else {
				expect(subscribeCount).toBe(2);
				done();
			}
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });
	// @ts-ignore - connect is set when the server is created above (synchronously)
	connect();

	let updateCount = 1;
	client
		.get('players')
		.get('1')
		.on((data) => {
			if (updateCount === 1) {
				expect(data).toEqual({ name: 'Thomas' });
				updateCount++;
			}
		});
});

test('should not update local cache on connection lost', (done) => {
	let updateCount = 0;

	let disconnect: () => void;
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect(callback) {
			disconnect = callback;
		},
		off() {},
		on() {},
		send() {
			updateCount++;
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient });
	// @ts-ignore - connect is set when the server is created above (synchronously)
	disconnect();
	client.get('players').get('1').set({ name: 'Thomas' });
	setTimeout(() => {
		expect(updateCount).toBe(0);
		done();
	}, 10);
});

test('can disconnect', (done) => {
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send() {},
		close() {
			expect(true);
			done();
		},
	};
	const client = SocketDBClient({ socketClient });
	client.disconnect();
});
