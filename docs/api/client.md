# Client

```ts
function SocketDBClient(config?: {
	url?: string;
	store?: Store;
	socketClient?: SocketClient;
	updateInterval?: number;
	plugins?: ClientPlugin[];
}): SocketDBClientAPI;

type SocketDBClientAPI = {
	disconnect: () => void;
} & ChainReference;

type ChainReference = {
	get: (path: string) => ChainReference;
	each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber;
	/**
	 * Save data and optionally add meta data.
	 *
	 * When passing an empty object as value, it will be ignored.
	 * This is useful for just setting meta data without changing any data itself.
	 * Note: This behavior might change in the future.
	 */
	set: (value: any, meta?: Meta) => ChainReference;
	delete: () => void;
	on: (callback: (data: any, meta?: Meta) => void) => Unsubscriber;
	once: (callback: (data: any, meta?: Meta) => void) => void;
};

type Unsubscriber = () => void;
```
