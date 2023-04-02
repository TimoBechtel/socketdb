/* eslint-disable @typescript-eslint/no-empty-function */
import { createStore, nodeify } from '@socketdb/core';
import { SocketDBServer } from './server';

test('allows providing hooks via plugins', (done) => {
	const store = createStore();
	const time = new Date().getTime();
	const server = SocketDBServer({
		store,
		socketServer: {
			listen() {},
			onConnection() {},
		},
		plugins: [
			{
				name: 'timestamp',
				hooks: {
					'server:update': ({ data }, { client }) => {
						// when update is called manually, client has no id
						expect(client.id).toBe(null);
						return {
							data: {
								value: data.value,
								meta: {
									...data.meta,
									updated: time,
								},
							},
						};
					},
				},
			},
		],
	});
	server.listen();

	server.update(
		nodeify({
			players: { 1: { name: 'Arnold' } },
		})
	);

	setTimeout(() => {
		// Note: jest errors are catched by socketdb and prevent the store from being updated
		expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
		expect(store.get()?.meta).toEqual({ updated: time });
		done();
	}, 10);
});

test('allows providing hooks via the intercept function', (done) => {
	// does the same as the previous test, but uses the intercept function instead of plugins

	const store = createStore();
	const time = new Date().getTime();
	const server = SocketDBServer({
		store,
		socketServer: {
			listen() {},
			onConnection() {},
		},
	});

	server.intercept('server:update', ({ data }, { client }) => {
		// when update is called manually, client has no id
		expect(client.id).toBe(null);
		return {
			data: {
				value: data.value,
				meta: {
					...data.meta,
					updated: time,
				},
			},
		};
	});

	server.listen();

	server.update(
		nodeify({
			players: { 1: { name: 'Arnold' } },
		})
	);

	setTimeout(() => {
		// Note: jest errors are catched by socketdb and prevent the store from being updated
		expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
		expect(store.get()?.meta).toEqual({ updated: time });
		done();
	}, 10);
});
