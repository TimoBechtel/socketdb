# @socketdb/plugin-validate

## Table of Contents

- [About](#about)
- [Installing](#installing)
- [Usage](#usage)

## About <a name = "about"></a>

Adds schema validation to [SocketDB](https://github.com/TimoBechtel/socketdb) to only allow saving data that matches the schema.

It uses [ajv](https://ajv.js.org/) under the hood.

## Installing <a name = "installing"></a>

Using pnpm:

```sh
pnpm add @socketdb/plugin-validate
```

or npm:

```sh
npm i @socketdb/plugin-validate
```

## Usage <a name = "usage"></a>

Create a schema and add plugin to the SocketDB server.

```ts
import { SocketDBServer } from 'socketdb';
import validate, { JSONSchemaType } from '@socketdb/plugin-validate';

type Data = {
	[key: string]: {
		player: {
			[id: string]: {
				name: string;
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
					required: ['name'],
					properties: {
						name: {
							type: 'string',
						},
					},
				},
			},
		},
	},
};

SocketDBServer({
	plugins: [validate(schema)],
});
```

See: <https://ajv.js.org/> for more information on how to create schemas.
