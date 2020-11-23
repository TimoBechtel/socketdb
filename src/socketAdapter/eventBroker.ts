type EventBroker = {
	addListener: (event: string, listener: (message: string) => void) => void;
	removeListener: (event: string, listener?: (message: string) => void) => void;
	notify: (event: string, data: any) => void;
};

export function createEventBroker(): EventBroker {
	const messageListener: {
		[event: string]: ((message: string) => void)[];
	} = {};

	function addListener(event: string, listener: (message: string) => void) {
		if (!messageListener[event]) messageListener[event] = [];
		messageListener[event].push(listener);
	}

	function removeListener(event: string, listener?: (message: string) => void) {
		if (listener)
			messageListener[event]?.splice(messageListener[event].indexOf(listener));
		else messageListener[event] = [];
	}

	function notify(event: string, data: any) {
		messageListener[event]?.forEach((listener) => listener(data));
	}
	return {
		addListener,
		removeListener,
		notify,
	};
}
