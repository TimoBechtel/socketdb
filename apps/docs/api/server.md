# Server

```ts
function SocketDBServer(config?: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin[];
}): SocketDB;

type SocketDB = {
	update: (data: Node) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
};
```
