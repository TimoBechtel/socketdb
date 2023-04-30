import { hasChildNodes, isNode, type Node } from './node';
import { parsePath } from './path';
import { isObject, mergeDiff } from './utils';

export type Store = {
	get: (path?: string) => Node | null;
	put: (diff: Node) => Node;
	del: (path: string) => void;
};

export function createStore(): Store {
	const store: Node = { value: {} };
	/**
	 * Note: returns null if path is not found
	 *
	 * When a node is returned with a value of null, it means we already tracked the path,
	 * but have not downloaded the data yet. (e.g. when subscribing keys only)
	 */
	function get(path = '') {
		let current = store;
		for (const key of parsePath(path)) {
			if (
				!hasChildNodes(current) ||
				current.value[key] === undefined ||
				current.value[key].value === null
			) {
				return null;
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
	function del(path: string) {
		const keys = parsePath(path);
		const deletedKey = keys[keys.length - 1];
		if (keys.length === 1) {
			if (isObject(store.value)) delete store.value[deletedKey];
			return;
		}
		const parentPath = path.slice(0, path.length - deletedKey.length - 1);
		const node = get(parentPath);
		if (isObject(node?.value)) delete node?.value[deletedKey];
	}
	return {
		get,
		put,
		del,
	};
}
