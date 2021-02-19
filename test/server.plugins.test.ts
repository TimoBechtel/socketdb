import { nodeify } from '../src/node';
import { SocketDBServer } from '../src/server';
import { createStore } from '../src/store';

test('allows providing hooks via plugins', (done) => {
	const store = createStore();
	const time = new Date().getTime();
	const server = SocketDBServer({
		store,
		socketServer: {
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

	server.update(
		nodeify({
			players: { 1: { name: 'Arnold' } },
		})
	);

	setTimeout(() => {
		// Note: jest errors are catched by socketdb and prevent the store from being updated
		expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
		expect(store.get().meta).toEqual({ updated: time });
		done();
	}, 10);
});
