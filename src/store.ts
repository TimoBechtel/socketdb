import { isNode, Node, nodeify } from './node';
import { parsePath } from './parsePath';
import { isObject, mergeDiff } from './utils';

export type Store = {
	get: (path?: string) => Node;
	put: (diff: Node) => Node;
	del: (path: string) => void;
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
	function del(path: string) {
		const keys = parsePath(path);
		const deletedKey = keys[keys.length - 1];
		if (keys.length === 1) {
			if (isObject(store.value)) delete store.value[deletedKey];
			return;
		}
		const parentPath = path.slice(0, path.length - deletedKey.length - 1);
		const node = get(parentPath);
		if (isObject(node.value)) delete node.value[deletedKey];
	}
	return {
		get,
		put,
		del,
	};
}
