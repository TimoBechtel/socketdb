import { joinPath } from './path';
import { isObject } from './utils';

type JsonPrimitives = string | number | boolean | null;

type JsonArray = (JsonPrimitives | Json | JsonArray)[];

// the leaf value can only be a primitive or a json array
export type LeafValue = JsonPrimitives | JsonArray;

export type Json = {
	[key: string]: JsonPrimitives | Json | JsonArray;
};

// might be extended by external socketdb plugins
export interface Meta {
	[namespace: string]: any;
}

export type Node<Schema extends Json | LeafValue = any> = {
	meta?: Meta;
	value: Schema extends Json
		? { [Key in keyof Schema]: Node<Schema[Key]> }
		: LeafValue;
};

export function isNode(value: any): value is Node {
	return (value as Node)?.value !== undefined;
}

export function nodeify<Schema extends Json | LeafValue>(
	data: Schema
): Node<Schema> {
	const node: { value: any } = { value: {} };
	if (isObject(data)) {
		Object.entries(data).forEach(([key, value]) => {
			if (isObject(value)) {
				node.value[key] = nodeify(value as Json);
			} else {
				node.value[key] = { value: value as any };
			}
		});
	} else {
		node.value = data;
	}
	return node;
}

export function unwrap<Schema extends Json | LeafValue>(
	node: Node<Schema>
): Schema {
	if (isObject(node.value)) {
		const data: { [key: string]: any } = {};
		Object.entries<Node<LeafValue | Json>>(node.value).forEach(
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

// deprecated exports for backwards compatibility
// TODO: remove in next major version
/**
 * @deprecated Use `Json` instead
 */
export type KeyValue = Json;
/**
 * @deprecated Use `LeafValue` instead
 */
export type Value = LeafValue;
