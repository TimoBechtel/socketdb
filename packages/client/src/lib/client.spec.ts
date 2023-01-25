/* eslint-disable @typescript-eslint/no-empty-function */
import {
	BatchedUpdate,
	createStore,
	DATA_CONTEXT,
	nodeify,
	SocketClient,
	SOCKET_EVENTS,
} from '@socketdb/core';
import { SocketDBClient } from './client';
import { mockSocketClient } from './socket-implementation/mockClient';

test('throws error when using * as pathname', () => {
	const { socketClient } = mockSocketClient();
	type Schema = {
		players: { [key: string]: { name: string } };
	};
	const client = SocketDBClient<Schema>({ socketClient });

	expect(() => client.get('players').get('1*').get('name')).toThrowError();
});

test('emits update object for path', (done) => {
	const { socketClient } = mockSocketClient({
		onSend(event, { data }) {
			expect(event).toEqual(SOCKET_EVENTS.data.clientUpdate);
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
	});

	const client = SocketDBClient({ socketClient });

	client.get('players').get('1').get('name').set('Patrick');
});

test('does not emit update if nothing changed', (done) => {
	let emitCount = 0;

	const store = createStore();
	store.put(nodeify({ players: { 1: { name: 'Patrick' } } }));

	const { socketClient } = mockSocketClient({
		onSend() {
			emitCount++;
			expect(emitCount).toEqual(0);
		},
	});

	const client = SocketDBClient({ socketClient, store });

	client.get('players').get('1').get('name').set('Patrick');

	setTimeout(() => {
		expect(emitCount).toEqual(0);
		done();
	}, 10);
});

test('deletes data and notifies local subscribers', (done) => {
	const store = createStore();

	const { notify, socketClient } = mockSocketClient({
		onSend(event, { data }: { data: BatchedUpdate }) {
			if (event === SOCKET_EVENTS.data.clientUpdate) {
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
					notify(`${DATA_CONTEXT}:players/1/name`, {
						data: {
							change: nodeify('Patrick'),
						},
					});
				} else {
					notify(`${DATA_CONTEXT}:players/1/name`, {
						data: {
							delete: data.delete,
						},
					});
				}
			}
		},
	});

	const client = SocketDBClient({
		socketClient,
		store,
		updateInterval: 5,
	});

	let updateCount = 0;
	client
		.get('players')
		.get('1')
		.get('name')
		.on((data) => {
			if (updateCount === 0) {
				updateCount++;
				expect(data).toEqual('Patrick');
				expect(store.get('players/1')).toEqual(nodeify({ name: 'Patrick' }));
				client.get('players').get('1').delete();
			} else if (updateCount === 1) {
				expect(data).toEqual(null);
				expect(store.get('players/1')).toEqual(null);
				done();
			}
		});

	client.get('players').get('1').get('name').set('Patrick');
});

test('should batch updates', (done) => {
	type Schema = {
		players: { [key: string]: { name: string; hp: number } };
	};

	let sendCount = 0;

	const { socketClient } = mockSocketClient({
		onSend(event, { data }) {
			expect(event).toEqual(SOCKET_EVENTS.data.clientUpdate);
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
	});

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

	const { socketClient, notify } = mockSocketClient();

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

	notify(`${DATA_CONTEXT}:players/1`, {
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
	notify(`${DATA_CONTEXT}:players/1`, {
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
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path, once }) {
			expect(event).toEqual(SOCKET_EVENTS.data.requestSubscription);
			expect(path).toBe('players/1');
			expect(once).not.toBe(true);
			notify(`${DATA_CONTEXT}:players/1`, {
				data: { change: nodeify({ name: 'Thomas' }) },
			});
			notify(`${DATA_CONTEXT}:players/1`, {
				data: { change: nodeify({ name: 'Thomas2' }) },
			});
			notify(`${DATA_CONTEXT}:players/1`, { data: { delete: ['players/1'] } });
		},
	});

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

	const { socketClient, notify } = mockSocketClient({
		onSend(event) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				subscribeCount++;
				setTimeout(() => {
					notify(`${DATA_CONTEXT}:players/1`, {
						data: { change: nodeify({ name: 'Thomas' }) },
					});
					unsubscribe();
					notify(`${DATA_CONTEXT}:players/1`, {
						data: { change: nodeify({ name: 'Thomas2' }) },
					});
				}, 10);
			} else if (event === SOCKET_EVENTS.data.requestUnsubscription) {
				unsubscribeCount++;
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

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
	}, 50);
});

test('can subscribe to path once', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path }) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				expect(path).toBe('players/1');
				notify(`${DATA_CONTEXT}:players/1`, {
					data: { change: nodeify('test') },
				});
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

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
	}, 50);
});

test('should batch subscribe events', (done) => {
	type Schema = {
		players: { [key: string]: { name: string; hp: number } };
	};

	let sendCount = 0;
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off() {},
		on() {},
		send(event, events) {
			// should batch all events in a single array
			expect(event).toEqual('events');
			expect(events).toHaveLength(5);

			sendCount++;
		},
		close() {},
	};
	const client = SocketDBClient<Schema>({ socketClient, updateInterval: 5 });

	// sendCount: 1
	// should subscribeKeys to players/1/*
	// event: (subscribeKeys, players/1)
	client
		.get('players')
		.get('1')
		.each(() => {});

	// sendCount: 2
	// should now subscribe to players/1/name
	// event: (subscribe, players/1/name)
	client
		.get('players')
		.get('1')
		.get('name')
		.on(() => {});

	// sendCount: 5
	// should now subscribe to players/1 and unsubscribe from players/1/name and keys of players/1
	// event1: (subscribe, players/1)
	// event2: (unsubscribe, players/1/*)
	// event3: (unsubscribe, players/1/name)
	client
		.get('players')
		.get('1')
		.on(() => {});

	// sendCount: 5
	// should not subscribe keys, as players/1 is already subscribed
	client
		.get('players')
		.get('1')
		.each(() => {});

	// sendCount: 5
	// should not subscribe to players/1/hp as players/1 is already subscribed
	client
		.get('players')
		.get('1')
		.get('hp')
		.each(() => {});

	setTimeout(() => {
		expect(sendCount).toBe(1);
		done();
	}, 50);
});

test('unsubscribing does not cancel other subscriptions', (done) => {
	// see: https://github.com/TimoBechtel/socketdb/issues/20

	const { socketClient, notify } = mockSocketClient({
		onSend(event, { data }) {
			if (event === SOCKET_EVENTS.data.clientUpdate) {
				expect(data).toEqual({
					change: nodeify({ path: 'test' }),
				});
				notify(`${DATA_CONTEXT}:path`, {
					data: { change: nodeify('test') },
				});
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

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
	}, 50);
});

test('can subscribe to keys of path', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path }) {
			if (event === SOCKET_EVENTS.data.requestKeysSubscription) {
				expect(path).toBe('players');
				notify(`${DATA_CONTEXT}:players/*`, { data: { added: ['1', '2'] } });
			}
		},
	});

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
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path }) {
			if (event === SOCKET_EVENTS.data.requestKeysSubscription) {
				expect(path).toBe('players');
				notify(`${DATA_CONTEXT}:players/*`, { data: { added: ['1'] } });
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

	let updateCount = 0;
	const unsubscribe = client.get('players').each((ref) => {
		updateCount++;
		expect(ref).toHaveProperty('get');
	});
	setTimeout(() => {
		unsubscribe();
		notify(`${DATA_CONTEXT}:players/*`, { data: { added: ['2', '3'] } });
		setTimeout(() => {
			expect(updateCount).toBe(1);
			done();
		}, 50);
	}, 50);
});

test('received data should not be passed as reference', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { data }) {
			if (event === SOCKET_EVENTS.data.clientUpdate) {
				notify(`${DATA_CONTEXT}:data`, {
					data: { change: data.change.value.data },
				});
			}
		},
	});

	const store = createStore();

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

	const { socketClient, notify } = mockSocketClient({
		onSend(event) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				notify(`${DATA_CONTEXT}:players/1`, {
					data: { change: { meta: metaExample, value: 'Thomas' } },
				});
			}
		},
	});

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

	const { socketClient } = mockSocketClient({
		onSend(_, { data }) {
			expect(data.change.value.players.value[1]).toEqual({
				value: 'b',
				meta: metaExample,
			});
			done();
		},
	});

	const client = SocketDBClient<Schema>({ socketClient });
	client.get('players').get('1').set('b', metaExample);
});

test('on/once always receives data on first call', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				notify(`${DATA_CONTEXT}:players/1`, {
					data: { change: nodeify({ name: 'Thomas' }) },
				});
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
	});

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
	const { socketClient, notify } = mockSocketClient({
		onSend(event) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				subscriptionCount++;
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 10 });

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
		notify(`${DATA_CONTEXT}:players`, {
			data: { change: nodeify({ 1: { name: 'Paul' } }) },
		});

		setTimeout(() => {
			expect(updateCount).toBe(4);
			done();
		}, 50);
	}, 50);
});

test('always subscribe to highest level path', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path }) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				subscriptionCount++;
				if (subscriptionCount === 2) {
					expect(path).toBe('players');
				}
			} else if (event === SOCKET_EVENTS.data.requestUnsubscription) {
				unsubscriptionCount++;
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

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
	notify(`${DATA_CONTEXT}:players`, {
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
	}, 50);
});

test('does not resubscribe to keys if higher level path is already subscribed', (done) => {
	const { socketClient, notify } = mockSocketClient({
		onSend(event, { path }) {
			if (event === SOCKET_EVENTS.data.requestKeysSubscription) {
				fail('should not subscribe to keys');
			}
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				expect(path).toBe('players');
				// simulate coming from server + make sure, "each" is called before
				// checks if each will receive updates coming from server
				setTimeout(() => {
					notify(`${DATA_CONTEXT}:players`, {
						data: { change: nodeify({ 1: 'test1', 2: 'test2' }) },
					});
				}, 10);
			}
		},
	});

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
	const { socketClient, notify } = mockSocketClient({
		onSend(event) {
			if (event === SOCKET_EVENTS.data.requestSubscription) {
				subscriptionCount++;
			}
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });

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

	notify(`${DATA_CONTEXT}:players`, { data: { change: nodeify(null) } });

	setTimeout(() => {
		expect(subscriptionCount).toBe(1);
		expect(testString).toBe('abcd');
		expect(updateCount).toBe(4);
		done();
	}, 50);
});

test('subscribes again after reconnect', (done) => {
	const { socketClient, notify, disconnect, reconnect } = mockSocketClient({
		onSend(event, { path, once }) {
			subscribeCount++;
			expect(event).toEqual(SOCKET_EVENTS.data.requestSubscription);
			expect(path).toBe('players/1');
			expect(once).not.toBe(true);
			if (subscribeCount === 1) {
				notify(`${DATA_CONTEXT}:players/1`, {
					data: { change: nodeify({ name: 'Thomas' }) },
				});
				disconnect();
				reconnect();
			} else {
				expect(subscribeCount).toBe(2);
				done();
			}
		},
	});

	let subscribeCount = 0;

	const client = SocketDBClient({ socketClient });

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

	const { disconnect, socketClient } = mockSocketClient({
		onSend() {
			updateCount++;
		},
	});
	const client = SocketDBClient({ socketClient });

	disconnect();
	client.get('players').get('1').set({ name: 'Thomas' });
	setTimeout(() => {
		expect(updateCount).toBe(0);
		done();
	}, 10);
});

test('can disconnect', (done) => {
	const { socketClient } = mockSocketClient({
		onClose() {
			expect(true);
			done();
		},
	});

	const client = SocketDBClient({ socketClient });
	client.disconnect();
});
