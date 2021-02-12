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
				events: {
					'server:update': ({ data }) => {
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
		expect(store.get('players/1/name')).toEqual({ value: 'Arnold' });
		expect(store.get().meta).toEqual({ updated: time });
		done();
	}, 10);
});
