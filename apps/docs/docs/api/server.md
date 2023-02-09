# Server

```ts
function SocketDBServer(config?: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
	plugins?: ServerPlugin[];
	autoListen?: boolean;
}): SocketDB;

type SocketDB = {
	update: (data: Node) => void;
	get: (path: string) => Node;
	delete: (path: string) => void;
	listen: (port?: number, callback?: () => void) => void;
};
```
