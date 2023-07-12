import { type GenericQueuedEvent } from '../batchedSocketEvents';
import { createEventBroker } from './eventBroker';
import { type Socket } from './socket';

/**
 * mocks a single socket connection that also unwraps batched events for easier testing
 *
 * @internal
 */
export function mockSocket({
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
		send(_, events: GenericQueuedEvent<any>[]) {
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

function createQueuedEvent(event: string, data: any) {
	return { event, data };
}

function batched(notify: (event: string, data: any) => void) {
	return (event: string, data: any) => {
		notify('events', [createQueuedEvent(event, data)]);
	};
}
