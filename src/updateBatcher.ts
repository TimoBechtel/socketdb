import { Node } from './node';
import { createStore } from './store';

type Queue = (update: Change | Deletion) => void;

export type BatchedUpdate = {
	delete?: string[];
	change?: Node;
};

type Change = {
	type: 'change';
	data: Node;
};

type Deletion = {
	type: 'delete';
	path: string;
};

export function createUpdateBatcher(
	flush: (batchedUpdate: BatchedUpdate) => void,
	updateInterval: number
): Queue {
	if (!updateInterval)
		return (update) => {
			if (update.type === 'delete') {
				flush({ delete: [update.path] });
			} else if (update.type === 'change') {
				flush({ change: update.data });
			}
		};

	let diff = createStore();
	let deletions: Set<string> = new Set();
	let pendingUpdate = null;

	return (update: Change | Deletion) => {
		if (!pendingUpdate) {
			diff = createStore();
			deletions = new Set();
			pendingUpdate = setTimeout(() => {
				pendingUpdate = null;
				const update: BatchedUpdate = {};
				if (deletions.size > 0) update.delete = Array.from(deletions);
				if (Object.keys(diff.get().value).length > 0)
					update.change = diff.get();
				flush(update);
			}, updateInterval);
		}

		if (update.type === 'delete') {
			diff.del(update.path);
			deletions.add(update.path);
		} else if (update.type === 'change') {
			diff.put(update.data);
		}
	};
}
