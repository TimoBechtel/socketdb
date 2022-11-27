# Custom Websocket-Server Implementation

SocketDB allows you to pass a custom websocket server implementation.
This is useful if you want to use a different websocket server implementation than the one provided by SocketDB or if you want to add authentication / authorization or user session information to your SocketDB instance.

By default SocketDB uses [ws](https://github.com/websockets/ws) as websocket server implementation.

## Example

```ts
import { createEventBroker, SocketServer } from '@socketdb/core';

export const createMyCustomWebsocketServer = (): SocketServer => {
	let ids = 0;
	const server = MyWebsocketServerImplementation.create();

	return {
		onConnection(callback) {
			server.on('connection', (socket) => {
				const connectionId = ids++;

				const { notify, addListener, removeListener } = createEventBroker();

				socket.on('message', (packet: string) => {
					const { event, data } = JSON.parse(packet);
					notify(event, data);
				});

				const sessionInformation = socket.getSessionInformation();

				callback(
					{
						onDisconnect(callback) {
							socket.on('close', callback);
						},
						on: addListener,
						off: removeListener,
						send(event, data) {
							socket.send(JSON.stringify({ event, data }));
						},
						close() {
							socket.close();
						},
					},
					connectionId + '',
					sessionInformation // here you can pass session information, like user data, etc. to be available to plugin hooks
				);
			});
		},
	};
};
```

```js
const server = SocketDBServer({
	socketServer: createMyCustomWebsocketServer(),
	plugins: [
		{
			name: 'log-user-data',
			hooks: {
				'server:clientConnect': (_, { client }) => {
					console.log(client.context);
					done();
				},
			},
		},
	],
});
```
