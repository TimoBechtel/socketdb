import { SocketDBClient, SocketDBServer } from '../../src/index';
import MockedSocket from 'socket.io-mock';

test('client receives updated data', (done) => {
	const socket = new MockedSocket();
	socket.id = '1';
	const client = SocketDBClient(socket.socketClient);

	let connect;
	SocketDBServer({
		on(topic: string, callback) {
			if (topic === 'connect') connect = callback;
		},
	} as any);
	connect(socket);

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
	const socket1 = new MockedSocket();
	socket1.id = '1';
	const client1 = SocketDBClient(socket1.socketClient);
	const socket2 = new MockedSocket();
	socket2.id = '2';
	const client2 = SocketDBClient(socket2.socketClient);

	let connect;
	SocketDBServer({
		on(topic: string, callback) {
			if (topic === 'connect') connect = callback;
		},
	} as any);
	connect(socket1);
	connect(socket2);

	const promises = [];

	let updateCount1 = 1;
	promises.push(
		new Promise((resolve) => {
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
		new Promise((resolve) => {
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
	const socket = new MockedSocket();
	socket.id = '1';
	const client = SocketDBClient(socket.socketClient);

	let connect;
	SocketDBServer(
		{
			on(topic: string, callback) {
				if (topic === 'connect') connect = callback;
			},
		} as any,
		{
			updateInterval: 0,
		}
	);
	connect(socket);

	let emitCount = 0;
	socket.socketClient.on('players', () => {
		emitCount++;
	});
	socket.socketClient.on('players/1', () => {
		emitCount++;
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
	}, 100);
});
