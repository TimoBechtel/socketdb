export function createEventBroker<
	Events extends {
		[event: string]: unknown;
	} = {
		[event: string]: unknown;
	}
>() {
	type Listener<Data extends Events[keyof Events]> = (data: Data) => void;

	const messageListener: {
		[event in keyof Events]?: Listener<Events[event]>[];
	} = {};

	function addListener<Key extends keyof Events>(
		event: Key,
		listener: Listener<Events[Key]>
	) {
		const currentListener = messageListener[event];
		if (currentListener) {
			currentListener.push(listener);
		} else {
			messageListener[event] = [listener];
		}

		return () => {
			removeListener(event, listener);
		};
	}

	function removeListener<Key extends keyof Events>(
		event: Key,
		listener?: Listener<Events[Key]>
	) {
		const currentListener = messageListener[event];
		if (currentListener) {
			if (listener) {
				const index = currentListener.indexOf(listener);
				if (index !== -1) {
					currentListener.splice(index, 1);
				}
			} else {
				messageListener[event] = [];
			}
		}
	}

	function notify<Key extends keyof Events>(event: Key, data: Events[Key]) {
		const currentListener = messageListener[event];
		if (currentListener) {
			currentListener.forEach((listener) => {
				listener(data);
			});
		}
	}
	return {
		addListener,
		removeListener,
		notify,
	};
}
