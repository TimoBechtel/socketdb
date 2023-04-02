# Server

```ts
function SocketDBServer(config?: {
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin<Schema>[];
	/**
	 * Interval in milliseconds between keep alive pings.
	 * @default 30000
	 *
	 * Set to 0 to disable keep alive.
	 */
	keepAliveInterval?: number;
}): SocketDBServerAPI;

type SocketDBServerAPI = {
	update: (data: Node) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
	listen: (port?: number, callback?: () => void) => void;
};
```
