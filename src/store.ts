import { isNode, Node, nodeify } from './node';
import { parsePath } from './parsePath';
import { mergeDiff } from './utils';

export type Store = {
	get: (path?: string) => Node;
	put: (diff: Node) => Node;
};

export function createStore(): Store {
	const store: Node = { value: {} };
	function get(path: string = '') {
		let current = store;
		for (let key of parsePath(path)) {
			if (
				current.value[key] === undefined ||
				current.value[key].value === null
			) {
				return nodeify(null);
			}
			current = current.value[key];
		}
		return current;
	}
	function put(diff: Node): Node {
		const _diff = mergeDiff(diff, store);
		if (!isNode(_diff)) _diff.value = {};
		return _diff as Node;
	}
	return {
		get,
		put,
	};
}
