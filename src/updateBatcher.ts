import { Node } from './node';
import { createQueue } from './queue';
import { createStore, Store } from './store';
import { isObject } from './utils';

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
	flushUpdate: (batchedUpdate: BatchedUpdate) => void,
	updateInterval: number
) {
	return createQueue<
		Change | Deletion,
		{ diff: Store; deletions: Set<string> }
	>({
		createState() {
			return {
				deletions: new Set(),
				diff: createStore(),
			};
		},
		batch(current, update) {
			if (update.type === 'delete') {
				current.diff.del(update.path);
				current.deletions.add(update.path);
			} else if (update.type === 'change') {
				current.diff.put(update.data);
			}
			return current;
		},
		flush({ deletions, diff }) {
			const update: BatchedUpdate = {};
			if (deletions.size > 0) update.delete = Array.from(deletions);
			const node = diff.get();
			if (isObject(node.value) && Object.keys(node.value).length > 0)
				update.change = node;
			flushUpdate(update);
		},
		updateInterval,
	});
}
