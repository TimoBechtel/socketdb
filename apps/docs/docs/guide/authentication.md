# Authentication

To add authentication to socketdb, you can pass a `initializeSession` function to the `createWebsocketServer` function. This also allows you to pass custom user data to plugins.

```ts
const socketServer = createWebsocketServer({
	initializeSession: async ({ req }) => {
		try {
			const session = await getSession(req);
			// fill context with user data
			return {
				user: session.user,
			};
		} catch (error) {
			// this will close the connection
			throw new WebsocketServerError({
				code: 'UNAUTHORIZED',
			});
		}
	},
});
```

Plugins then have access to the context object.

```ts
const server = SocketDBServer({
	socketServer,
	plugins: [
		{
			name: 'example-plugin',
			hooks: {
				'server:update': async (data, { client }) => {
					console.log(client.context); // { user: { id: 1 } }
				},
			},
		},
	],
});
```

## Using with typescript

When using typescript, you can override the type of the context object. For example:

```ts
declare module '@socketdb/server' {
	interface SessionContext {
		user: {
			id: string;
		};
	}
}
```

## Example for a jwt token authentication

This authentication example uses a jwt token to authenticate the user. The token is passed as a query parameter.

```ts
import { createWebsocketServer } from '@socketdb/server';
import jwt from 'jsonwebtoken';
import { parseUrl } from 'query-string';

const CLIENT_SECRET = process.env.CLIENT_SECRET;

const socketServer = createWebsocketServer({
	initializeSession: async ({ req }) => {
		// get token from query, e.g. ws://localhost:8080?token=...
		const { token } = parseUrl(req.url ?? '').query as { token: string };
		if (!token) throw new WebsocketServerError({ code: 'BAD_REQUEST' });
		try {
			const decoded = jwt.verify(token, CLIENT_SECRET);
			return {
				user: decoded,
			};
		} catch (error) {
			throw new WebsocketServerError({
				code: 'UNAUTHORIZED',
			});
		}
	},
});
```
