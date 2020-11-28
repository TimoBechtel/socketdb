import { createEventBroker } from './eventBroker';
import { SocketServer } from './socketServer';
import ws from 'ws';

export const createWebsocketServer = (
	options: ws.ServerOptions
): SocketServer => {
	const { notify, addListener, removeListener } = createEventBroker();

	let ids = 0;
	const server = new ws.Server(options);

	return {
		onConnection(callback) {
			server.on('connection', (socket) => {
				socket.on('message', (packet: string) => {
					const { event, data } = JSON.parse(packet);
					notify(event, data);
				});

				callback(
					{
						on: addListener,
						off: removeListener,
						send(event, data) {
							try {
								socket.send(JSON.stringify({ event, data }));
							} catch (error) {
								console.error(error);
							}
						},
					},
					ids++ + ''
				);
			});
		},
	};
};
