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

It currently uses socket.io, so you also need to install socket.io:

```
npm install -D socket.io
```

## Usage examples

### Client

```js
import io from 'socket.io-client';
import { SocketDBClient } from 'socketdb';

const client = SocketDBClient(io());

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

Using express:

```js
import socketio from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { SocketDBServer } from 'socketdb';

const server = createServer(express()).listen(port, () => {
	console.log(`server listening on localhost:${port}`);
});

const fps = 30;
SocketDBServer(socketio(server), {
	updateInterval: 1000 / fps,
});
```

## Roadmap

- improve performance (currently high cpu usage)
- replace socket.io with vanilla websockets
- come up with a better name
