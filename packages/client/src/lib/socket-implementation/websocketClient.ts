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
	let socket: Promise<WebSocket> | null = null;
	let lastConnectUrl: string;

	async function connect(url: string) {
		if ((await socket)?.readyState === WebSocket.CONNECTING) return;

		// close previous connection if it exists
		if ((await socket)?.readyState === WebSocket.OPEN) {
			disconnect();
		}

		socket = new Promise((resolve) => {
			lastConnectUrl = url;
			manuallyClosed = false;

			const _socket = new WebSocket(url, protocols);
			_socket.onopen = () => {
				resolve(_socket);
				onOpen();
			};
			_socket.onmessage = onMessage;
			_socket.onclose = onClose;
			_socket.onerror = onError;
		});
		return socket;
	}

	async function disconnect() {
		manuallyClosed = true;
		const ws = await socket;
		if (ws?.readyState === WebSocket.CLOSING) return;
		ws?.close();
	}

	function onOpen() {
		socketEvents.notify('connection-opened', undefined);
	}

	function onMessage({ data: packet }: MessageEvent) {
		const { event, data } = JSON.parse(packet);
		messageEvents.notify(event, data);
	}

	async function onError(event: Event) {
		console.error('Socket error:', event);
		socketEvents.notify('connection-error', event);
		(await socket)?.close();
	}

	function onClose() {
		socketEvents.notify('connection-closed', undefined);
		if (!manuallyClosed && lastConnectUrl)
			setTimeout(() => {
				connect(lastConnectUrl);
			}, reconnectTimeout);
	}

	async function sendMessage(message: string) {
		const ws = await socket;
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(message);
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
