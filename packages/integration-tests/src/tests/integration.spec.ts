/* eslint-disable @typescript-eslint/no-empty-function */
import { mockSocketClient, SocketDBClient } from '@socketdb/client';
import {
	createEventBroker,
	createStore,
	nodeify,
	type Socket,
	type SocketClient,
	type SocketServer,
	SOCKET_EVENTS,
} from '@socketdb/core';
import { mockSocketServer, SocketDBServer } from '@socketdb/server';

test('client receives updated data', (done) => {
	const { connectClient, socketServer } = mockSocketServer();

	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			notifyServer(event, data);
		},
	});

	const client = SocketDBClient({
		socketClient,
	});

	SocketDBServer({ socketServer }).listen();

	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
	});

	let updateCount1 = 1;

	client.get('players').on((data) => {
		if (updateCount1 === 1) {
			expect(data).toEqual(null);
		} else {
			expect(data).toEqual({
				1: {
					name: 'Test',
				},
			});
			done();
		}
		updateCount1++;
	});
	client.get('players').get('1').set({ name: 'Test' });
});

test('all clients receive data on update', async () => {
	const { connectClient, socketServer } = mockSocketServer();

	const { notify: notifyC1, socketClient: socket1 } = mockSocketClient({
		onSend(event, data) {
			notifyS1(event, data);
		},
	});

	const { notify: notifyC2, socketClient: socket2 } = mockSocketClient({
		onSend(event, data) {
			notifyS2(event, data);
		},
	});

	const client1 = SocketDBClient({
		socketClient: socket1,
	});
	const client2 = SocketDBClient({
		socketClient: socket2,
	});

	SocketDBServer({ socketServer }).listen();

	const { notify: notifyS1 } = connectClient({
		onSend(event, data) {
			notifyC1(event, data);
		},
	});

	const { notify: notifyS2 } = connectClient({
		onSend(event, data) {
			notifyC2(event, data);
		},
	});

	const promises = [];

	let updateCount1 = 1;
	promises.push(
		new Promise<void>((resolve) => {
			client1.get('players').on((data) => {
				if (updateCount1 === 1) {
					expect(data).toEqual(null);
				} else {
					expect(data).toEqual({
						1: {
							name: 'Test',
						},
					});
					resolve();
				}
				updateCount1++;
			});
		})
	);
	let updateCount2 = 1;
	promises.push(
		new Promise<void>((resolve) => {
			client2.get('players').on((data) => {
				if (updateCount2 === 1) {
					expect(data).toEqual(null);
				} else {
					expect(data).toEqual({
						1: {
							name: 'Test',
						},
					});
					resolve();
				}
				updateCount2++;
			});
		})
	);
	client1.get('players').get('1').set({ name: 'Test' });
	await Promise.all(promises);
});

test('only sends data once for every update on same root path', (done) => {
	let emitCount = 0;

	const { connectClient, socketServer } = mockSocketServer();
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			emitCount++;
			notifyServer(event, data);
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({ socketServer, updateInterval: 5 }).listen();

	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
	});

	client.get('players').on(() => {});
	client
		.get('players')
		.get('1')
		.once(() => {});
	client.get('players').get('2').set({ name: 'karl' });
	client
		.get('players')
		.get('2')
		.get('name')
		.on(() => {});

	setTimeout(() => {
		expect(emitCount).toBe(2);
		done();
	}, 50);
});

test('on/once always receives data on first call, even when not subscribed to before', (done) => {
	const { connectClient, socketServer } = mockSocketServer();
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			notifyServer(event, data);
		},
	});

	const client = SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({ socketServer, updateInterval: 5 }).listen();

	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
	});

	client.get('players').get('1').set({ name: 'Test' });

	setTimeout(() => {
		client.get('players').on((data) => {
			expect(data).toEqual({
				1: {
					name: 'Test',
				},
			});
			done();
		});
	}, 15);
});

test('should notify client on deletion', (done) => {
	const { connectClient, socketServer } = mockSocketServer();
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			notifyServer(event, data);
		},
	});

	const store = createStore();

	const client = SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({ socketServer, updateInterval: 5, store }).listen();

	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
	});

	store.put(nodeify({ players: { 1: { name: 'Test' } } }));

	let updateCount = 0;
	client
		.get('players')
		.get('1')
		.get('name')
		.on((data) => {
			if (updateCount === 0) {
				expect(data).toEqual('Test');
			} else {
				expect(data).toEqual(null);
				done();
			}
			updateCount++;
		});

	client.get('players').get('1').delete();
});

test('should batch all socket events', (done) => {
	type Schema = {
		players: { [key: string]: { name: string } };
	};

	const clientEventBroker = createEventBroker();
	const serverEventBroker = createEventBroker();
	const store = createStore();

	let clientEmitCount = 0;
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: clientEventBroker.removeListener,
		on: clientEventBroker.addListener,
		send: (e, d) => {
			clientEmitCount++;
			serverEventBroker.notify(e, d);
		},
		close() {},
	};
	const client = SocketDBClient({ socketClient, updateInterval: 10 });

	let connect: (client: Socket, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
		listen() {},
	};
	SocketDBServer({ socketServer, updateInterval: 10, store }).listen();

	let serverEmitCount = 0;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore - connect is set when the server is created above (synchronously)
	connect(
		{
			onDisconnect() {},
			on: serverEventBroker.addListener,
			off: serverEventBroker.removeListener,
			send: (e, d) => {
				serverEmitCount++;
				clientEventBroker.notify(e, d);
			},
			close() {},
		},
		'1'
	);

	const numberOfExamplePlayers = 10;
	const examplePlayers = Array.from({ length: numberOfExamplePlayers }).reduce<
		Schema['players']
	>(
		(acc, _, i) => ({
			...acc,
			[`${i + 1}`]: { name: `Test ${i}` },
		}),
		{}
	);

	store.put(nodeify({ players: examplePlayers }));

	let numberOfOnCallbackCalls = 0;

	// client should send "subscribeKeys" for players/ : clientEmitCount = 1
	// server should answer with the keys              : serverEmitCount = 1
	client.get('players').each((ref, name) => {
		// client should now send "subscribe" events, but these should be batched : clientEmitCount = 2
		// server should answer with the data, but also batched                   : serverEmitCount = 2
		ref.on((p) => {
			// still, we get a call for every player : numberOfOnCallbackCalls = 10
			expect(p).toEqual(examplePlayers[name as string]);
			numberOfOnCallbackCalls++;
		});
	});

	setTimeout(() => {
		expect(clientEmitCount).toBe(2);
		expect(serverEmitCount).toBe(2);
		expect(numberOfOnCallbackCalls).toBe(numberOfExamplePlayers);
		done();
	}, 100);
});

test('path subscribe callback notifies again after node has been re-attached (created, deleted, created)', (done) => {
	/**
	 * Make sure that `each callbacks` are called again after a node has been re-attached (after deletion, data for the same path is received again)
	 */
	const { connectClient, socketServer } = mockSocketServer();
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			notifyServer(event, data);
		},
	});

	const store = createStore();

	const client = SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({ socketServer, updateInterval: 5, store }).listen();

	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
	});

	store.put(nodeify({ users: { 1: { name: 'Test' } } }));

	let updateCount = 0;
	client.get('users').each((_, key) => {
		if (updateCount === 0) {
			setTimeout(() => {
				client.get('users').get('1').delete();
				setTimeout(() => {
					client.get('users').get('1').set({ name: 'Test' });
				}, 100);
			}, 50);
		}
		expect(key).toEqual('1');
		updateCount++;
	});

	setTimeout(() => {
		expect(updateCount).toEqual(2);
		done();
	}, 500);
});

test('server should periodically send a ping and client should return a pong', (done) => {
	const { connectClient, socketServer } = mockSocketServer();
	let pongs = 0;
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			if (pongs === 0) {
				expect(event).toEqual(SOCKET_EVENTS.keepAlive.pong);
				notifyServer(event, data);
				done();
			}
			pongs++;
		},
	});

	SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({
		socketServer,
		updateInterval: 5,
		keepAliveInterval: 5,
	}).listen();

	let pings = 0;
	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			if (pings === 0) {
				expect(event).toEqual(SOCKET_EVENTS.keepAlive.ping);
				notifyClient(event, data);
			}
			pings++;
		},
	});
});

test('keepAlive heartbeat allows sending payloads using plugins', (done) => {
	const { connectClient, socketServer } = mockSocketServer();
	const payloadFromServer = { hello: 'client' };
	const payloadFromClient = { hello: 'server' };

	let pongs = 0;
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend(event, data) {
			if (pongs === 0) {
				expect(event).toEqual(SOCKET_EVENTS.keepAlive.pong);
				expect(data).toEqual(payloadFromClient);
				notifyServer(event, data);
				done();
			}
			pongs++;
		},
	});

	SocketDBClient({
		socketClient,
		updateInterval: 5,
		plugins: [
			{
				name: 'test',
				hooks: {
					'client:heartbeat': (serverPayload) => {
						expect(serverPayload).toEqual(payloadFromServer);
						return payloadFromClient;
					},
				},
			},
		],
	});
	SocketDBServer({
		socketServer,
		updateInterval: 5,
		keepAliveInterval: 5,
		plugins: [
			{
				name: 'test',
				hooks: {
					'server:keepAliveCheck': () => {
						return payloadFromServer;
					},
					'server:heartbeat': (payload) => {
						expect(payload).toEqual(payloadFromClient);
					},
				},
			},
		],
	}).listen();

	let pings = 0;
	const { notify: notifyServer } = connectClient({
		onSend(event, data) {
			if (pings === 0) {
				expect(event).toEqual(SOCKET_EVENTS.keepAlive.ping);
				expect(data).toEqual(payloadFromServer);
				notifyClient(event, data);
			}
			pings++;
		},
	});
});

test('server closes connection when the client stops reacting to ping requests', (done) => {
	const { connectClient, socketServer } = mockSocketServer();
	const { notify: notifyClient, socketClient } = mockSocketClient({
		onSend() {
			// never send a pong to simulate a non-responding client
		},
	});

	SocketDBClient({ socketClient, updateInterval: 5 });
	SocketDBServer({
		socketServer,
		updateInterval: 5,
		keepAliveInterval: 20,
	}).listen();

	connectClient({
		onSend(event, data) {
			notifyClient(event, data);
		},
		onClose() {
			// connection should be closed after a failed ping
			done();
		},
	});
});
