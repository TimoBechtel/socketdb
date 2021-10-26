type EventBroker<T> = {
	addListener: (event: string, listener: (message: T) => void) => void;
	removeListener: (event: string, listener?: (message: T) => void) => void;
	notify: (event: string, data: T) => void;
};

export function createEventBroker<T = any>(): EventBroker<T> {
	const messageListener: {
		[event: string]: ((message: T) => void)[];
	} = {};

	function addListener(event: string, listener: (message: T) => void) {
		if (!messageListener[event]) messageListener[event] = [];
		messageListener[event].push(listener);
	}

	function removeListener(event: string, listener?: (message: T) => void) {
		if (listener)
			messageListener[event]?.splice(
				messageListener[event].indexOf(listener),
				1
			);
		else messageListener[event] = [];
	}

	function notify(event: string, data: T) {
		messageListener[event]?.forEach((listener) => listener(data));
	}
	return {
		addListener,
		removeListener,
		notify,
	};
}
