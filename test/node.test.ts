import { isNode, Node, nodeify, traverseNode, unwrap } from '../src/node';

test('wraps object with nodes', () => {
	const obj = {
		a: {
			b: {
				d: 'string',
			},
			c: 1,
			d: null,
		},
	};

	expect(nodeify(obj)).toEqual<Node>({
		value: {
			a: {
				value: {
					b: {
						value: {
							d: {
								value: 'string',
							},
						},
					},
					c: {
						value: 1,
					},
					d: {
						value: null,
					},
				},
			},
		},
	});
});

test('wraps string', () => {
	expect(nodeify('string')).toEqual({ value: 'string' });
});

test('unwraps node', () => {
	const node: Node = {
		value: {
			a: {
				value: {
					b: {
						value: {
							d: {
								value: 'string',
							},
						},
					},
					c: {
						value: 1,
					},
				},
			},
		},
	};

	expect(unwrap(node)).toEqual({
		a: {
			b: {
				d: 'string',
			},
			c: 1,
		},
	});
});

test('unwraps node with a single string', () => {
	expect(unwrap({ value: 'string' })).toEqual('string');
});

test('traverses node until true was returned', () => {
	const node: Node = nodeify({
		player: { 1: { position: { x: 0, y: 1 } }, 2: {} },
	});
	let loopCount = 0;
	traverseNode(node, (path) => {
		loopCount++;
		if (path === 'player/1/position') return true;
	});
	expect(loopCount).toBe(4);
});

test('checks if value is node', () => {
	expect(isNode({})).toBe(false);
	expect(isNode('')).toBe(false);
	expect(isNode(0)).toBe(false);
	expect(isNode(undefined)).toBe(false);
	expect(isNode(null)).toBe(false);
});
