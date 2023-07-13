import { createEventBroker, type SocketClient } from '@socketdb/core';

type Unsubscriber = () => void;

// This is needed until the SocketClient type is updated. It is not yet as this is a breaking change.
interface DefaultWebsocketClient extends SocketClient {
	onConnect: (...args: Parameters<SocketClient['onConnect']>) => Unsubscriber;
	onDisconnect: (
		...args: Parameters<SocketClient['onDisconnect']>
	) => Unsubscriber;
	onError: (callback: (error: unknown) => void) => Unsubscriber;
	connect: (url: string) => Promise<void>;
}

// This is needed until the SocketClient type is updated. It is not yet as this is a breaking change.
export function __isDefaultWebsocketClient(
	client: SocketClient
): client is DefaultWebsocketClient {
	return 'onError' in client && 'connect' in client;
}

export const createWebsocketClient = ({
	protocols,
	reconnectTimeout = 1000 * 5,
}: {
	protocols?: string[];
	reconnectTimeout?: number;
} = {}): DefaultWebsocketClient => {
	if (typeof WebSocket === 'undefined') {
		console.error(
			'Error: You tried to use the default WebsocketClient in a non-browser environment.',
			'This is currently not supported.'
		);
		console.error(
			'To use the SocketDBClient in a node environment, you need to provide your own WebsocketClient.'
		);
	}

	const messageEvents = createEventBroker();
	const socketEvents = createEventBroker<{
		'connection-closed': void;
		'connection-opened': void;
		'connection-error': unknown;
	}>();

	let manuallyClosed = false;
	let socket: WebSocket | null = null;
	let lastConnectUrl: string;
	let reconnectTimeoutId: ReturnType<typeof setTimeout>;

	// messages that will be queued while the socket is connecting
	const queuedMessages: string[] = [];

	async function connect(url: string) {
		if (
			socket?.readyState === WebSocket.CONNECTING ||
			socket?.readyState === WebSocket.OPEN
		) {
			// ignore if we are already connected/connecting to the same url
			if (url === lastConnectUrl) return;
			// otherwise we close it, so we can connect to the new url
			disconnect();
		}

		lastConnectUrl = url;
		manuallyClosed = false;
		if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);

		const newSocket = new WebSocket(url, protocols);
		newSocket.onopen = () => {
			socketEvents.notify('connection-opened', undefined);
			// send messages that might have been queued while the socket was connecting
			queuedMessages.forEach((message) => {
				newSocket.send(message);
			});
			queuedMessages.length = 0;
		};
		newSocket.onmessage = ({ data: packet }) => {
			const { event, data } = JSON.parse(packet);
			messageEvents.notify(event, data);
		};
		newSocket.onclose = () => {
			socketEvents.notify('connection-closed', undefined);
			if (!manuallyClosed && lastConnectUrl) {
				if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
				reconnectTimeoutId = setTimeout(() => {
					connect(lastConnectUrl);
				}, reconnectTimeout);
			}
		};
		newSocket.onerror = (event) => {
			socketEvents.notify('connection-error', event);
			console.error('Websocket connection failed.');
			newSocket.close();
		};

		socket = newSocket;
	}

	async function disconnect() {
		manuallyClosed = true;
		if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
		if (!socket) return;
		if (
			socket.readyState === WebSocket.CLOSING ||
			socket.readyState === WebSocket.CLOSED
		)
			return;
		socket.close();
	}

	async function sendMessage(message: string) {
		// when the socket is connecting, we queue messages
		// this allows us to call db.set() while where still connecting
		// we should not queue messages otherwise, as this may cause sync issues
		if (socket?.readyState === WebSocket.CONNECTING) {
			queuedMessages.push(message);
			return;
		}

		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(message);
		}
	}

	return {
		onConnect(callback) {
			return socketEvents.addListener('connection-opened', callback);
		},
		onDisconnect(callback) {
			return socketEvents.addListener('connection-closed', callback);
		},
		onError(callback) {
			return socketEvents.addListener('connection-error', callback);
		},
		on: messageEvents.addListener,
		off: messageEvents.removeListener,
		send(event, data) {
			sendMessage(JSON.stringify({ event, data }));
		},
		close() {
			disconnect();
		},
		async connect(url: string) {
			await connect(url);
		},
	};
};
