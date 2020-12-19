# Client

```ts
function SocketDBClient(config?: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
}): ChainReference;

type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	set: (value: any) => ChainReference;
	on: (callback: (data: any) => void) => Unsubscriber;
	once: (callback: (data: any) => void) => void;
};

type Unsubscriber = () => void;
```
