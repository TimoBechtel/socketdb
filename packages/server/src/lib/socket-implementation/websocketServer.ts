import { createEventBroker, SocketServer } from '@socketdb/core';
import ws from 'ws';

export const createWebsocketServer = (
	options: ws.ServerOptions
): SocketServer => {
	let ids = 0;
	const server = new ws.Server(options);

	return {
		onConnection(callback) {
			server.on('connection', (socket) => {
				const { notify, addListener, removeListener } = createEventBroker();

				socket.on('message', (packet) => {
					const message =
						typeof packet === 'string' ? packet : packet.toString();
					const { event, data } = JSON.parse(message);
					notify(event, data);
				});

				callback(
					{
						onDisconnect(callback) {
							socket.on('close', callback);
						},
						on: addListener,
						off: removeListener,
						send(event, data) {
							try {
								socket.send(JSON.stringify({ event, data }));
							} catch (error) {
								console.error(error);
							}
						},
						close() {
							socket.close();
						},
					},
					ids++ + ''
				);
			});
		},
	};
};
