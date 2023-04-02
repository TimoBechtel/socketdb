# Server usage

```js
import { SocketDBServer } from '@socketdb/server';
const server = SocketDBServer(options);
```

## options (object)

- `port: number` (optional) port on which to listen for websocket connections, default: 8080
- `store: Store` (optional)
  in-memory cache, allows you to set a custom store, see [custom-store](custom-store), default
- `socketServer: SocketServer` (optional)
  allows you to use a custom websocket server
- `updateInterval: number` (optional)
  Updates are batched and sent in intervals. Here you can set the rate at which updates are sent.
  set it to 0 to disable batching, defaults to: 50
- `plugins: ServerPlugin[]` (optional)
  set [plugins](plugins)

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
