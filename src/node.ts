import { isObject, joinPath } from './utils';

export type Node = {
	meta?: { [namespace: string]: any };
	value: { [key: string]: Node } | string | number | any[];
};

export function isNode(value: any): value is Node {
	return (value as Node).value !== undefined;
}

export function nodeify(data: any): Node {
	const node: Node = { value: {} };
	if (isObject(data)) {
		Object.entries(data).forEach(([key, value]) => {
			if (isObject(value)) {
				node.value[key] = nodeify(value);
			} else {
				node.value[key] = { value };
			}
		});
	} else {
		node.value = data;
	}
	return node;
}

export function unwrap(node: Node) {
	if (isObject(node.value)) {
		const data = {};
		Object.entries(node.value).forEach(([key, node]: [string, Node]) => {
			if (isObject(node.value)) data[key] = unwrap(node);
			else data[key] = node.value;
		});
		return data;
	} else {
		return node.value;
	}
}

export function traverseNode(
	node: Node,
	callback: (path: string, data: Node) => void | true
) {
	let stack: { node: Node; path: string }[] = [{ node, path: '' }];
	while (stack.length) {
		const current = stack.pop();
		for (let [key, node] of Object.entries(current.node.value)) {
			const path = joinPath(current.path, key);
			const result = callback(path, node);
			if (result === true) return;
			if (isObject(node.value)) stack.push({ node, path });
		}
	}
}
