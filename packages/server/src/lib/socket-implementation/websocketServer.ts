import { createEventBroker, SocketServer } from '@socketdb/core';
import { createServer, IncomingMessage } from 'http';
import ws from 'ws';
import { SessionContext } from '../server';
import { createHttpResponse, WebsocketServerError } from './httpUpgradeError';
import { createIncrementalIdGenerator } from './incrementalIdGenerator';

/**
 * options that are passed to the ws.Server constructor
 */
type CustomizableWSOptions = Omit<ws.ServerOptions, 'noServer' | 'port'>;

interface DefaultWebsocketServer extends SocketServer {
	onConnection: (
		...args: Parameters<SocketServer['onConnection']>
	) => () => void;
}

type EventBrokerEvents = {
	connection: {
		params: Parameters<Parameters<SocketServer['onConnection']>[0]>;
	};
};

export const createWebsocketServer = ({
	initializeSession,
	generateId = createIncrementalIdGenerator(),
	server: httpServer = createServer(),
	...wsOptions
}: {
	/**
	 * A returned session context will be available in plugins.
	 * You can use this to authenticate a user and  pass additional user data to plugins, e.g. an external user id.
	 *
	 * You can throw a `WebsocketServerError` to reject the connection with a specific error code.
	 */
	initializeSession?: (params: {
		req: IncomingMessage;
	}) => SessionContext | Promise<SessionContext>;
	/**
	 * Id generation function. Defaults to an incremental id generator.
	 */
	generateId?: () => string;
} & CustomizableWSOptions = {}): DefaultWebsocketServer => {
	const wsServer = new ws.Server({
		...wsOptions,
		noServer: true,
		port: undefined,
	});
	const clientConnectionListeners = createEventBroker<EventBrokerEvents>();

	httpServer.on('upgrade', async (request, socket, head) => {
		let sessionContext: SessionContext | undefined;
		if (initializeSession) {
			try {
				sessionContext = await initializeSession({ req: request });
			} catch (error) {
				if (error instanceof WebsocketServerError) {
					socket.write(createHttpResponse(error.code));
					socket.destroy();
					return;
				}
				socket.write(createHttpResponse('INTERNAL_SERVER_ERROR'));
				socket.destroy();
				return;
			}
		}

		wsServer.handleUpgrade(request, socket, head, (client) => {
			const socketEvents = createEventBroker();

			client.on('message', (packet) => {
				const message = typeof packet === 'string' ? packet : packet.toString();
				const { event, data } = JSON.parse(message);
				socketEvents.notify(event, data);
			});

			clientConnectionListeners.notify('connection', {
				params: [
					{
						onDisconnect(callback) {
							client.on('close', callback);
						},
						on: socketEvents.addListener,
						off: socketEvents.removeListener,
						send(event, data) {
							try {
								client.send(JSON.stringify({ event, data }));
							} catch (error) {
								console.error(error);
							}
						},
						close() {
							client.close();
						},
					},
					generateId(),
					sessionContext,
				],
			});
		});
	});

	return {
		onConnection(callback) {
			return clientConnectionListeners.addListener('connection', ({ params }) =>
				callback(...params)
			);
		},
		listen(port, callback) {
			httpServer.listen(port, callback);
		},
	};
};
