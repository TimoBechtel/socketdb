# Custom Store

You can use your own store for the [SocketDBClient](/api/client) as well as [SocketDBServer](/api/server).
This allows you to, for example, to add persistence to your application.

Simply write a function that returns an object with two functions:

```ts
type Store = {
	get: (path?: string) => any;
	put: (diff: {
		[key: string]: any;
	}) => {
		[key: string]: any;
	};
};
```

- `get` returns a data object or value for a specific path. (e.g. `persons/thomas`);
- `put` saves changed data in the store and returns an object containing a diff object with all updated data.

Or you can simply extend the default store:

```js
import { createStore } from 'socketdb';

const { get, put } = createStore();

function myCustomStore() {
	return {
		get,
		put(diff) {
			console.log('udpated data', diff);
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
