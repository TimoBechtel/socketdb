import { NormalizedPath, joinPath } from './path';
import { isObject } from './utils';

type JsonPrimitives = string | number | boolean | null | undefined;

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
		? { [key in keyof Schema]: Node<Schema[key]> }
		: Schema;
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

export function hasChildNodes(node?: Node): node is Node<Json> {
	return isObject(node?.value);
}

export function traverseNode(
	node: Node,
	callback: (path: NormalizedPath, data: Node) => void | true
) {
	const stack: { node: Node; path: NormalizedPath }[] = [
		{ node, path: '' as NormalizedPath<''> },
	];
	while (stack.length) {
		const current = stack.pop();
		if (!current) return;
		if (!hasChildNodes(current.node)) return;

		for (const [key, node] of Object.entries(current.node.value)) {
			const path = joinPath(current.path, key);
			const result = callback(path, node);
			if (result === true) return;
			if (isObject(node.value)) stack.push({ node, path });
		}
	}
}
