export type Queue<T> = (data: T) => void;

export function createQueue<QueuedData, BatchedData>({
	batch,
	createState,
	flush,
	updateInterval,
}: {
	createState: () => BatchedData;
	batch: (current: BatchedData, update: QueuedData) => BatchedData;
	flush: (batchedData: BatchedData) => void;
	updateInterval?: number;
}): Queue<QueuedData> {
	if (!updateInterval)
		return (update) => {
			flush(batch(createState(), update));
		};

	let current = createState();
	let pendingUpdate: ReturnType<typeof setTimeout> | null = null;

	return (update) => {
		if (!pendingUpdate) {
			current = createState();
			pendingUpdate = setTimeout(() => {
				pendingUpdate = null;
				flush(current);
			}, updateInterval);
		}

		current = batch(current, update);
	};
}
