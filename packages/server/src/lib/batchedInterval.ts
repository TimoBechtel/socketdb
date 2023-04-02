/**
 * Creates a queue of callbacks that are executed in batches.
 *
 * Basically a single setInterval that executes all callbacks in the queue.
 *
 * TODO: We might want to merge this with queue.ts? Or at least re-use it.
 */
export function createBatchedInterval({
	interval = 1000,
}: {
	interval?: number;
}) {
	const callbacks: Set<() => void> = new Set();
	let pendingInterval: ReturnType<typeof setInterval> | null = null;

	function startIntervalIfNeeded() {
		if (callbacks.size > 0 && !pendingInterval) {
			pendingInterval = setInterval(() => {
				callbacks.forEach((item) => item());
			}, interval);
		}
	}

	function stopIntervalIfNeeded() {
		if (callbacks.size === 0 && pendingInterval) {
			clearInterval(pendingInterval);
			pendingInterval = null;
		}
	}

	function add(cb: () => void) {
		callbacks.add(cb);
		startIntervalIfNeeded();

		return () => {
			callbacks.delete(cb);
			stopIntervalIfNeeded();
		};
	}

	return {
		add,
	};
}
