# Custom Store

You can use your own store for the [SocketDBClient](/api/client) as well as [SocketDBServer](/api/server).
This allows you to, for example, to add persistence to your application.

Simply write a function that returns an object with these functions:

```ts
type Store = {
	get: (path?: string) => Node;
	put: (diff: Node) => Node;
	del: (path: string) => void;
};
```

- `get` returns a data object or value for a specific path. (e.g. `persons/thomas`);
- `put` saves changed data in the store and returns an object containing a diff object with all updated data.
- `del` deletes nodes for a given path

Node has following type definition:

```ts
type Node = {
	meta?: { [namespace: string]: any };
	value: { [key: string]: Node } | string | number | any[];
};
```

Or you can simply extend the default store:

```js
import { createStore } from 'socketdb';

const { get, put, del } = createStore();

function myCustomStore() {
	return {
		get,
		del,
		put(diff) {
			console.log('updated data', diff);
			return put(diff);
		},
	};
}
```

This can be used instead of the default one on initialization:

**client side:**

```js
const db = SocketDBClient({
	store: myCustomStore(),
});
```

**Server side:**

```js
SocketDBServer({
	store: myCustomStore(),
});
```
