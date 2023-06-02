# Server usage

```js
import { SocketDBServer } from '@socketdb/server';
const server = SocketDBServer(options);
```

## options (object)

- `store: Store` (optional)
  in-memory cache, allows you to set a custom store, see [custom-store](custom-store), default
- `socketServer: SocketServer` (optional)
  allows you to use a custom websocket server
- `updateInterval: number` (optional)
  Updates are batched and sent in intervals. Here you can set the rate at which updates are sent.
  set it to 0 to disable batching, defaults to: 50
- `plugins: ServerPlugin[]` (optional)
  set [plugins](plugins)
- `keepAliveInterval: number` (optional)
  Interval in milliseconds between keep alive pings. Set to 0 to disable keep alive. Defaults to 30000

## existing server

If you want to use SocketDB with an existing server, like express, you can initialize the WebsocketServer with your existing server.

For example:

```js
import { SocketDBServer, createWebsocketServer } from '@socketdb/server';
import { createServer } from 'http';
import express from 'express';
const app = express();
const server = createServer(app);

SocketDBServer({
	socketServer: createWebsocketServer({ server }),
});

server.listen(8080);
```

## get

`get: (path: string) => Node`

Allows you to get current data from server for given path.

```js
server.get('it/together');
```

## update

`update: (data: Node) => void`

Allows you to update current data on server. Argument needs to be a Node.

```js
server.update({
	value: { player: { value: { Peter: { value: { hp: { value: 1 } } } } } },
});
```

## delete

`delete: (path: string) => void`

Allows you to delete data for a given path.

```js
server.delete('my/fears');
```

## listen

`listen: (port?: number, callback?: () => void) => void`

Starts the server on given port. Defaults to 8080.

```js
server.listen(8080, () => {
	console.log('server is listening');
});
```

## intercept

`intercept: (hook: Hook, callback: ServerHooks[Hook]) => () => void`

Allows you to intercept server hooks without having to define a plugin. See [what hooks are available](create-plugins#server).

```js
const unsubscribe = server.intercept('server:clientConnect', ({ id }) => {
	console.log('client connected', id);
});

// later
unsubscribe();
```

## getClient

`getClient: (id: string | ((context: SessionContext) => boolean)) => Client | null`

Returns the client with the given id or null if no client was found. You can also pass a filter function to find a specific client.

```js
const client = server.getClient('connection-id');
const client = server.getClient((context) => context.userId === 'user-id');
```

## getClients

`getClients: (filter?: (context: SessionContext) => boolean) => Client[]`

Returns all clients or clients that match the given filter function.

```js
const clients = server.getClients();
const clients = server.getClients((context) => context.userId === 'user-id');
```
