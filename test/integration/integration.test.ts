import { SocketDBClient, SocketDBServer } from '../../src/index';
import { createEventBroker } from '../../src/socketAdapter/eventBroker';
import { Socket } from '../../src/socketAdapter/socket';
import { SocketClient } from '../../src/socketAdapter/socketClient';
import { SocketServer } from '../../src/socketAdapter/socketServer';

test('client receives updated data', (done) => {
	const clientEventBroker = createEventBroker();
	const serverEventBroker = createEventBroker();

	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: clientEventBroker.removeListener,
		on: clientEventBroker.addListener,
		send: serverEventBroker.notify,
	};
	const client = SocketDBClient({ socketClient });

	let connect: (client: Socket, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ socketServer });
	connect(
		{
			onDisconnect() {},
			on: serverEventBroker.addListener,
			off: serverEventBroker.removeListener,
			send: clientEventBroker.notify,
		},
		'1'
	);

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
	const client1EventBroker = createEventBroker();
	const client2EventBroker = createEventBroker();
	const serverEventBroker = createEventBroker();

	const client1 = SocketDBClient({
		socketClient: {
			onConnect() {},
			onDisconnect() {},
			off: client1EventBroker.removeListener,
			on: client1EventBroker.addListener,
			send: serverEventBroker.notify,
		},
	});
	const client2 = SocketDBClient({
		socketClient: {
			onConnect() {},
			onDisconnect() {},
			off: client2EventBroker.removeListener,
			on: client2EventBroker.addListener,
			send: serverEventBroker.notify,
		},
	});

	let connect: (client: Socket, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ socketServer });

	connect(
		{
			onDisconnect() {},
			on: serverEventBroker.addListener,
			off: serverEventBroker.removeListener,
			send: client1EventBroker.notify,
		},
		'1'
	);
	connect(
		{
			onDisconnect() {},
			on: serverEventBroker.addListener,
			off: serverEventBroker.removeListener,
			send: client2EventBroker.notify,
		},
		'2'
	);

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
	const clientEventBroker = createEventBroker();
	const serverEventBroker = createEventBroker();

	let emitCount = 0;
	const socketClient: SocketClient = {
		onConnect() {},
		onDisconnect() {},
		off: clientEventBroker.removeListener,
		on: clientEventBroker.addListener,
		send(event, data) {
			emitCount++;
			serverEventBroker.notify(event, data);
		},
	};
	const client = SocketDBClient({ socketClient });

	let connect: (client: Socket, id: string) => void;

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
	};
	SocketDBServer({ socketServer });
	connect(
		{
			onDisconnect() {},
			on: serverEventBroker.addListener,
			off: serverEventBroker.removeListener,
			send: clientEventBroker.notify,
		},
		'1'
	);

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
	}, 100);
});
