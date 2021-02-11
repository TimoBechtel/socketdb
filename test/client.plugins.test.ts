import { SocketDBClient } from '../src/client';
import { SocketClient } from '../src/socketAdapter/socketClient';
import { createStore } from '../src/store';

test('allow providing hooks via plugins', (done) => {
	const socketClient: SocketClient = {
		onConnect(connect) {
			setTimeout(connect);
		},
		onDisconnect() {},
		off() {},
		on() {},
		send() {},
	};
	const store = createStore();
	const client = SocketDBClient({
		socketClient,
		store,
		plugins: [
			{
				name: 'myplugin',
				events: {
					'client:firstConnect': () => {
						expect(true);
					},
					'client:set': ({ path, value }) => {
						expect(path).toEqual('players/1/name');
						expect(value).toEqual('Patrick');
						done();
					},
				},
			},
		],
	});

	client.get('players').get('1').get('name').set('Patrick');
});
