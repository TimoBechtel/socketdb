import { createEventBroker } from './eventBroker';
import { SocketClient } from './socketClient';

export const createWebsocketClient = ({
	url,
	protocols,
	reconnectTimeout = 1000 * 5,
}: {
	url: string;
	protocols?: string[];
	reconnectTimeout?: number;
}): SocketClient => {
	const messageEvents = createEventBroker();
	const connectionClosedListener = [];
	const connectionOpenedListener = [];

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

	function onOpen() {
		connectionOpenedListener.forEach((callback) => callback());
	}

	function onMessage({ data: packet }) {
		const { event, data } = JSON.parse(packet);
		messageEvents.notify(event, data);
	}

	async function onError(error) {
		console.log(error);
		(await socket).close();
	}

	function onClose() {
		connectionClosedListener.forEach((callback) => callback());
		setTimeout(() => {
			connect();
		}, reconnectTimeout);
	}

	async function sendMessage(message: string) {
		(await socket).send(message);
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
	};
};