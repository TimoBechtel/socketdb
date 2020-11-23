# socketdb

Real-time data storage

> Synchronize data between your webclients in real-time.

Info: Currently a non-stable version, so api might change!

## Features

- subscription based data transfer
- only sends data that is requested and has changed
- data is sent in batches
- simple api

## Install

```sh
npm install -D socketdb
```

## Usage examples

### Client

```js
import { SocketDBClient } from 'socketdb';

const client = SocketDBClient({
	url: 'ws://localhost:8080',
});

client.get('players').all((player, name) => {
	player.get('position').on(({ x, y }) => {
		console.log(`player, ${name} moved:`, x, y);
	});
});

client.get('players').once((players) => {
	console.log('players changed: ', players);
});

client.get('players').get('karl').get('position').set({ x: 0, y: 1 });

client.get('players').set({ paul: { position: { x: 9, y: 9 } } });

// => players changed: { karl: { position: { x: 0, y: 1 } } }
// => player, karl moved: 0 1
// => player, paul moved: 9 9
```

### Server

```js
import { SocketDBServer } from 'socketdb';

const fps = 30;
SocketDBServer({
	port: 8080,
	updateInterval: 1000 / fps,
});
```

Using express:

```js
import { createServer } from 'http';
import express from 'express';
import { SocketDBServer } from 'socketdb';

const port = 8080;

const server = createServer(express()).listen(port, () => {
	console.log(`server listening on localhost:${port}`);
});

const fps = 30;
const socketdb = SocketDBServer({
	socketServer: createWebsocketServer({ server }),
	updateInterval: 1000 / fps,
});
```

## Roadmap

- [ ] improve performance (currently high cpu usage)
- [x] replace socket.io with vanilla websockets
- [ ] come up with a better name
