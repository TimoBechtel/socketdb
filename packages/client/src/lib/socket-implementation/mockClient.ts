import { mockSocket, type SocketClient } from '@socketdb/core';

export function mockSocketClient({
	onClose,
	onSend,
}: {
	onSend?: (event: string, data: any) => void;
	onClose?: () => void;
} = {}) {
	const { disconnect, notify, socket } = mockSocket({ onClose, onSend });
	let connect: () => void = () => {
		throw new Error('connect not yet initialized');
	};

	const socketClient: SocketClient = {
		...socket,
		onConnect(callback) {
			connect = callback;
			// simulate connection
			setTimeout(() => {
				callback();
			}, 10);
		},
	};

	return {
		socketClient,
		disconnect,
		notify,
		reconnect: () => connect(),
	};
}
