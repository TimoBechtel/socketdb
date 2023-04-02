/* eslint-disable @typescript-eslint/no-empty-function */

import { createStore, SocketClient } from '@socketdb/core';
import { SocketDBClient } from './client';

test('allow providing hooks via plugins', (done) => {
	const socketClient: SocketClient = {
		onConnect(connect) {
			setTimeout(connect);
		},
		onDisconnect() {},
		off() {},
		on() {},
		send() {},
		close() {},
	};
	const store = createStore();
	const client = SocketDBClient({
		socketClient,
		store,
		plugins: [
			{
				name: 'myplugin',
				hooks: {
					'client:firstConnect': () => {
						expect(true);
					},
					'client:set': ({ path, value, meta }) => {
						// note: errors here will not throw,
						// because they are catched by the hooks system
						expect(path).toEqual('players/1/name');
						expect(value).toEqual('Patrick');
						expect(meta).toEqual({ owner: 'test' });
						done();
					},
				},
			},
		],
	});

	client.get('players').get('1').get('name').set('Patrick', { owner: 'test' });
});

test('allow providing hooks via the intercept function', (done) => {
	// does the same as the previous test, but uses the intercept function instead of plugins

	const socketClient: SocketClient = {
		onConnect(connect) {
			setTimeout(connect);
		},
		onDisconnect() {},
		off() {},
		on() {},
		send() {},
		close() {},
	};
	const store = createStore();
	const client = SocketDBClient({ socketClient, store });

	client.intercept('client:firstConnect', () => {
		expect(true);
	});

	client.intercept('client:set', ({ path, value, meta }) => {
		// note: errors here will not throw,
		// because they are catched by the hooks system
		expect(path).toEqual('players/1/name');
		expect(value).toEqual('Patrick');
		expect(meta).toEqual({ owner: 'test' });
		done();
	});

	client.get('players').get('1').get('name').set('Patrick', { owner: 'test' });
});
