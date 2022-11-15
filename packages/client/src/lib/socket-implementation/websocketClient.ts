import { createEventBroker, SocketClient } from '@socketdb/core';

export const createWebsocketClient = ({
	url,
	protocols,
	reconnectTimeout = 1000 * 5,
}: {
	url: string;
	protocols?: string[];
	reconnectTimeout?: number;
}): SocketClient => {
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
	const connectionClosedListener: (() => void)[] = [];
	const connectionOpenedListener: (() => void)[] = [];
	let manuallyClosed = false;

	let socket: Promise<WebSocket>;

	connect();

	function connect() {
		socket = new Promise((resolve) => {
			const _socket = new WebSocket(url, protocols);
			_socket.onopen = () => {
				resolve(_socket);
				onOpen();
			};
			_socket.onmessage = onMessage;
			_socket.onclose = onClose;
			_socket.onerror = onError;
		});
	}

	async function disconnect() {
		manuallyClosed = true;
		(await socket).close();
	}

	function onOpen() {
		connectionOpenedListener.forEach((callback) => callback());
	}

	function onMessage({ data: packet }: MessageEvent) {
		const { event, data } = JSON.parse(packet);
		messageEvents.notify(event, data);
	}

	async function onError(error: Event) {
		console.log(error);
		(await socket).close();
	}

	function onClose() {
		connectionClosedListener.forEach((callback) => callback());
		if (!manuallyClosed)
			setTimeout(() => {
				connect();
			}, reconnectTimeout);
	}

	async function sendMessage(message: string) {
		const ws = await socket;
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(message);
		}
	}

	return {
		onConnect(callback) {
			connectionOpenedListener.push(callback);
		},
		onDisconnect(callback) {
			connectionClosedListener.push(callback);
		},
		on: messageEvents.addListener,
		off: messageEvents.removeListener,
		send(event: string, data: any) {
			sendMessage(JSON.stringify({ event, data }));
		},
		close() {
			disconnect();
		},
	};
};
