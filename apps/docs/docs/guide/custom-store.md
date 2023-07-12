# Custom Store

You can use your own store for the [SocketDBClient](/api/modules/socketdb_client#socketdbclient) as well as [SocketDBServer](/api/modules/socketdb_server#socketdbserver).
This allows you to, for example, add persistence to your application.

> You might need to install the core utils package for this: `@socketdb/core`

Simply write a function that returns an object with these functions:

```ts
type Store = {
	get: (path?: string) => Node | null;
	put: (diff: Node) => Node;
	del: (path: string) => void;
};
```

- `get` returns a data node for a specific path. (e.g. path: `users/thomas`), or `null` if there is no data for the given path.
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
import { createStore } from '@socketdb/core';

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
