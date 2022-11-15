/* eslint-disable @typescript-eslint/no-empty-function */
import { nodeify } from '@socketdb/core';
import { JSONSchemaType, pluginValidate } from './plugin-validate';

type Data = {
	[key: string]: {
		player: {
			[id: string]: {
				name: string;
				x: number;
				y: number;
			};
		};
	};
};
const schema: JSONSchemaType<Data> = {
	type: 'object',
	required: [],
	additionalProperties: {
		type: 'object',
		required: ['player'],
		properties: {
			player: {
				type: 'object',
				required: [],
				additionalProperties: {
					type: 'object',
					required: ['name', 'y', 'x'],
					properties: {
						name: {
							type: 'string',
						},
						x: {
							type: 'integer',
						},
						y: {
							type: 'integer',
						},
					},
				},
			},
		},
	},
};
test('validates updated data', () => {
	const plugin = pluginValidate(schema);

	const validData = nodeify({
		'123': {
			player: {
				'1': {
					name: 'Thomas',
					x: 0,
					y: 1,
				},
			},
		},
	} as Data);

	const invalidData = nodeify({
		somedata: {
			player: {
				anArray: [1, 2, 3],
			},
		},
		aNumber: 123,
	});

	expect(() =>
		plugin.hooks['server:update']?.(
			{
				data: validData,
			},
			{
				client: { id: '123', context: {} },
				api: {
					get: () => validData,
					delete() {},
					update() {},
				},
			}
		)
	).not.toThrow();

	expect(() =>
		plugin.hooks['server:update']?.(
			{
				data: invalidData,
			},
			{
				client: { id: '123', context: {} },
				api: {
					get: () => invalidData,
					delete() {},
					update() {},
				},
			}
		)
	).toThrow();
});

test('allow partial updates', () => {
	const plugin = pluginValidate(schema);

	const storedData = nodeify({
		'123': {
			player: {
				'1': {
					name: 'Thomas',
					x: 0,
					y: 1,
				},
			},
		},
	} as Data);

	const updatedData = nodeify({
		'123': {
			player: {
				'1': {
					y: 2,
				},
			},
		},
	});

	expect(() =>
		plugin.hooks['server:update']?.(
			{
				data: updatedData,
			},
			{
				client: { id: '123', context: {} },
				api: {
					get: () => storedData,
					delete() {},
					update() {},
				},
			}
		)
	).not.toThrow();
});

test('validates deleted data', () => {
	const plugin = pluginValidate(schema);

	const storedData = nodeify({
		'123': {
			player: {
				'1': {
					name: 'Thomas',
					x: 0,
					y: 1,
				},
			},
		},
	} as Data);

	const validDeletePath = '123';
	const invalidDeletePath = '123/player/1/name';

	expect(() => {
		plugin.hooks['server:delete']?.(
			{ path: validDeletePath },
			{
				client: { id: '123', context: {} },
				api: {
					get: () => storedData,
					delete() {},
					update() {},
				},
			}
		);
	}).not.toThrow();

	expect(() => {
		plugin.hooks['server:delete']?.(
			{ path: invalidDeletePath },
			{
				client: { id: '123', context: {} },
				api: {
					get: () => storedData,
					delete() {},
					update() {},
				},
			}
		);
	}).toThrow();
});
