import { joinPath } from './path';
import { isObject } from './utils';

export type Value = string | number | boolean | null | Value[];

// might be extended by external socketdb plugins
export interface Meta {
	[namespace: string]: any;
}

export type KeyValue = {
	[key: string]: Value | KeyValue;
};

export type Node<Schema extends KeyValue | Value = any> = {
	meta?: Meta;
	value: Schema extends KeyValue
		? { [Key in keyof Schema]: Node<Schema[Key]> }
		: Value;
};

export function isNode(value: any): value is Node {
	return (value as Node)?.value !== undefined;
}

export function nodeify<Schema extends KeyValue | Value>(
	data: Schema
): Node<Schema> {
	const node: { value: any } = { value: {} };
	if (isObject(data)) {
		Object.entries(data).forEach(([key, value]) => {
			if (isObject(value)) {
				node.value[key] = nodeify(value as KeyValue);
			} else {
				node.value[key] = { value: value as any };
			}
		});
	} else {
		node.value = data;
	}
	return node;
}

export function unwrap<Schema extends KeyValue | Value>(
	node: Node<Schema>
): Schema {
	if (isObject(node.value)) {
		const data: { [key: string]: any } = {};
		Object.entries<Node<Value | KeyValue>>(node.value).forEach(
			([key, node]) => {
				if (isObject(node.value)) data[key] = unwrap(node);
				else data[key] = node.value;
			}
		);
		return data as Schema;
	} else {
		return node.value as unknown as Schema;
	}
}

export function traverseNode(
	node: Node,
	callback: (path: string, data: Node) => void | true
) {
	const stack: { node: Node; path: string }[] = [{ node, path: '' }];
	while (stack.length) {
		const current = stack.pop();
		if (!current) return;
		if (!isObject(current.node.value)) return;

		for (const [key, node] of Object.entries(current.node.value)) {
			const path = joinPath(current.path, key);
			const result = callback(path, node);
			if (result === true) return;
			if (isObject(node.value)) stack.push({ node, path });
		}
	}
}
