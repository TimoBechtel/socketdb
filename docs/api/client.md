# Client

```ts
function SocketDBClient(config?: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
	updateInterval?: number;
	plugins?: ClientPlugin[];
}): ChainReference;

type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	set: (value: any, meta?: Meta) => ChainReference;
	delete: () => void;
	on: (callback: (data: any, meta: Meta) => void) => Unsubscriber;
	once: (callback: (data: any, meta: Meta) => void) => void;
};

type Unsubscriber = () => void;
```
