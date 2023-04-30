import { mockSocket, type Socket, type SocketServer } from '@socketdb/core';

/**
 * creates a mock socket server for testing
 */
export function mockSocketServer() {
	let connect: (client: Socket, id: string) => void = () => {
		throw new Error('connect not yet initialized');
	};

	const socketServer: SocketServer = {
		onConnection(callback) {
			connect = callback;
		},
		listen() {
			// no-op
		},
	};

	return {
		connectClient: ({
			id = generateId(),
			onSend,
			onClose,
		}: {
			id?: string;
			onSend?: (event: string, data: any) => void;
			onClose?: () => void;
		} = {}) => {
			const { disconnect, notify, socket } = mockSocket({
				onClose,
				onSend,
			});
			connect(socket, id);
			return {
				disconnect,
				notify,
			};
		},
		socketServer,
	};
}

function generateId() {
	return Math.random().toString(36).substring(2, 15).toUpperCase();
}
