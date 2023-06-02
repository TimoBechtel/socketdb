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
	intercept: <Hook extends keyof ServerHooks<Schema>>(hook: Hook, callback: ServerHooks<Schema>[Hook]) => () => void;
	/**
	 * Returns the client with the given id or null if no client was found.
	 *
	 * You can also pass a filter function to find a client.
	 */
	getClient: (id: string | ((context: SessionContext) => boolean)) => Client | null;
	getClients: (filter?: (context: SessionContext) => boolean) => Client[];
};
```
