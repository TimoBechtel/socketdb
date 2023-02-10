import { createStore, Json, mergeDiff, nodeify, unwrap } from '@socketdb/core';
import type { ServerPlugin } from '@socketdb/server';
import AJV, { JSONSchemaType } from 'ajv';

export function pluginValidate<DataType extends Json>(
	schema: JSONSchemaType<DataType>
): ServerPlugin<DataType> {
	const ajv = new AJV();
	const validate = ajv.compile(schema);
	return {
		name: 'schema',
		hooks: {
			'server:update': ({ data }, { api }) => {
				const storedData = api.get('');
				mergeDiff(data, storedData);
				if (!validate(unwrap(storedData)))
					throw {
						name: 'invalid',
						message: 'Data is invalid.',
						errors: validate.errors,
					};
			},
			'server:delete': ({ path }, { api }) => {
				const tmpStore = createStore();
				tmpStore.put(api.get(''));
				tmpStore.del(path);
				if (!validate(unwrap(tmpStore.get() ?? nodeify(null)))) {
					throw {
						name: 'invalid',
						message: 'Data is invalid.',
						errors: validate.errors,
					};
				}
			},
		},
	};
}

export type { JSONSchemaType };
