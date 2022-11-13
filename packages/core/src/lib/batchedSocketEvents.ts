import { createQueue } from './queue';
import { createEventBroker } from './socket-connection/eventBroker';
import { Socket } from './socket-connection/socket';

type GenericEvents = {
	[key: string]: any;
};

export type GenericQueuedEvent<Events extends GenericEvents> = {
	event: keyof Events;
	data: Events[keyof Events];
};

export function createBatchedClient<Events extends GenericEvents>(
	connection: Socket,
	interval?: number
) {
	type QueuedEvent = GenericQueuedEvent<Events>;

	const events = createEventBroker<QueuedEvent['data']>();

	const queue = createQueue<QueuedEvent, QueuedEvent[]>({
		batch(current, update) {
			return [...current, update];
		},
		createState() {
			return [];
		},
		flush(events) {
			connection.send('events', events);
		},
		updateInterval: interval,
	});

	connection.on('events', (socketEvents: QueuedEvent[]) => {
		socketEvents?.forEach((event) => {
			events.notify(event.event as string, event.data);
		});
	});

	return {
		queue<K extends keyof Events>(event: K, data: Events[K]) {
			queue({ event, data });
		},
		subscribe<K extends keyof Events>(
			event: K,
			callback: (data: Events[K]) => void
		) {
			events.addListener(event as string, callback as any);
			return () => events.removeListener(event as string, callback as any);
		},
		unsubscribe<K extends keyof Events>(
			event: K,
			callback?: (data: Events[K]) => void
		) {
			events.removeListener(event as string, callback as any);
		},
	};
}
