# Client usage

```js
import { SocketDBClient } from '@socketdb/client';
const db = SocketDBClient(options);
```

## Data Schema

When using typescript, I recommend to add a schema. This way you get full type checking and auto completion:

```ts
type Schema = {
	users: {
		[id: string]: {
			name: string;
		};
	};
};

const db = SocketDBClient<Schema>(options);

db.get('users').get('1').set({ name: 1 }); // => throws a ts compilation error
```

</code-group>

## options (object)

- `url: string` (optional)
  url to SocketDBServer, defaults to: `ws://${window.location.hostname}:${window.location.port}`
- `store: Store` (optional)
  in-memory cache, allows you to set a custom store, see [custom-store](custom-store), default
- `socketClient: SocketClient` (optional)
  websocket client, allows you to use a custom websocket client
- `updateInterval: number` (optional)
  Updates are batched and sent in intervals. Here you can set the rate at which updates are sent.
  set it to 0 to disable batching, defaults to: 50
- `plugins: ClientPlugin[]` (optional)
  set [plugins](plugins)

## get

`get: (path: string) => ChainReference;`

Allows you to get a reference to a specific node.

```js
const node = db.get('sweets').get('chocolate');
```

## on

`on: (callback: (data: any, meta: Meta) => void) => Unsubscriber;`

Subscribe to a specific path.
Every time a value in this path gets updated, the provided function
will be called with the current value and metadata for that path.

`on` will return an unsubscriber function that allows you to unsubscribe from changes.

::: warning Note
If no data is available or was deleted, `data` (or `meta`) will be `null`.  
So you need to check for a `null` value.
:::

```js
const unsubscribe = db.get('friends/status').on((data, meta) => {
	console.log(data, meta);
});
```

## once

`once: (callback: (data: any, meta: Meta) => void) => void`

Same as `on`, but only receives data once.
It will automatically unsubscribe from server after receiving data.

```js
db.get('meaning-of')
	.get('life')
	.once((answer, meta) => {
		console.log(answer, meta); // 42, { question: null }
	});
```

## each

`each: (callback: (ref: ChainReference, key: string) => void) => Unsubscriber`

Allows you to subscribe to sub-nodes of a path.

It will be called every time a new node was added to a path.

The new node's path will be passed as first argument and its name as second.

```js
db.get('posts').each((node, key) => {
	console.log('new post: ', key);
	node.on((post) => {
		console.log('post updated', post);
	});
});
```

## set

`set: (value: any, meta?: Meta) => ChainReference`

Allows you to update data for a path. You can store anything that is serializable with JSON.stringify/JSON.parse.

If you pass an object as argument, missing paths will automatically be created.

```js
db.get('player')
	.get('42')
	.set({ position: { x: 0, y: 1 } });

db.get('player').get('9').get('position').get('x').set(2);

db.get('player').get('123').get('items').set(['rock', 'paper', 'scissors']);
```

### metadata

The second argument allows you to set metadata for a specific path.
Metadata allows you to set additional data for any path. It will be synced across browsers just like any other data.
Especially useful in connection with [plugins](plugins).

It needs to be an object with at least one attribute. Value can be anything you like.

```js
db.get('rooms').get('cellar').set({ size: 13 }, { hidden: true });

db.get('rooms').each((roomNode) => {
	roomNode.once((room, meta) => {
		if (!meta.hidden) console.log(room);
	});
});
```

## delete

`delete: () => void`

Deletes a node on a given path. If you're subscribed to a deleted path, you will receive `null`.

```js
db.get('bitcoin').get('wallet').get('d92nd8f').delete();

db.get('bitcoin/wallet')
	.get('d92nd8f')
	.on((wallet) => {
		// wallet is now null
	});
```

::: warning Be careful
After deleting a node, it is still possible to set data for the same path or subpath.  
So make sure to not update its child nodes after deleting, or otherwise you might end up with partial data!
:::

## disconnect

`disconnect: () => void`

Closes connection to server.
