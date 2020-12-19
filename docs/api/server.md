# Server

```ts
function SocketDBServer(config?: {
	port?: number;
	store?: Store;
	updateInterval?: number;
	socketServer?: SocketServer;
}): SocketDB;

type SocketDB = {
	update: (data: any) => void;
	get: (path: string) => any;
};
```
