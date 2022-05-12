import { createEventBroker } from '../src';
import { GenericQueuedEvent } from '../src/batchedSocketEvents';
import { Socket } from '../src/socketAdapter/socket';
import { SocketClient } from '../src/socketAdapter/socketClient';
import { SocketServer } from '../src/socketAdapter/socketServer';

function createQueuedEvent(event: string, data: any) {
	return { event, data };
}

function batched(notify: (event: string, data: any) => void) {
	return (event: string, data: any) => {
		notify('data', { events: [createQueuedEvent(event, data)] });
	};
}

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

/**
 * mocks a single socket connection that also unwraps batched events for easier testing
 */
function mockSocket({
	onClose,
	onSend,
}: {
	onSend?: (event: string, data: any) => void;
	onClose?: () => void;
} = {}) {
	const { addListener, notify, removeListener } = createEventBroker();
	let disconnect: () => void = () => {
		throw new Error('disconnect not yet initialized');
	};
	const socket: Socket = {
		on: addListener,
		off: removeListener,
		close() {
			onClose?.();
		},
		onDisconnect(callback) {
			disconnect = callback;
		},
		send(_, { events }: { events: GenericQueuedEvent<any>[] }) {
			events.forEach((event) => {
				onSend?.(event.event as string, event.data);
			});
		},
	};

	return {
		socket,
		disconnect: () => disconnect(),
		notify: batched(notify),
	};
}

function generateId() {
	return Math.random().toString(36).substring(2, 15).toUpperCase();
}
