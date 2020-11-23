import { createEventBroker } from './eventBroker';
import { SocketClient } from './socketClient';

export const createWebsocketClient = ({
	url,
	protocols,
}: {
	url: string;
	protocols?: string[];
}): SocketClient => {
	const { notify, addListener, removeListener } = createEventBroker();

	const socket = new WebSocket(url, protocols);

	socket.onmessage = ({ data: packet }) => {
		const { event, data } = JSON.parse(packet);
		notify(event, data);
	};

	const connectionReady = new Promise((resolve, reject) => {
		socket.onerror = (error) => reject(error);
		socket.onopen = () => resolve();
	});

	async function sendMessage(message: string) {
		await connectionReady;
		socket.send(message);
	}

	return {
		on: addListener,
		off: removeListener,
		send(event: string, data: any) {
			sendMessage(JSON.stringify({ event, data }));
		},
	};
};
