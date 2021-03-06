# Plugins

## Write plugins

SocketDB can be extended using plugins.

Plugins can tap into exposed hooks to extend the functionality of SocketDB:

```ts
const client = SocketDBClient({
	plugins: [
		{
			name: 'myplugin',
			hooks: {
				'client:set': ({ path, value, meta }) => {
					meta.updated = new Date().getTime();
					return {
						path,
						value,
						meta,
					};
				},
			},
		},
	],
});
```

If your plugins middleware returns a value, this value will be passed to the next plugin
and finally processed internally instead of the initial arguments.

## Available hooks

### Client

```ts
type ClientHooks = {
	'client:set'?: Hook<{ path: string; value: any; meta: Meta }>;
	'client:delete'?: Hook<{ path: string }>;
	'client:firstConnect'?: Hook;
	'client:reconnect'?: Hook;
	'client:disconnect'?: Hook;
};
type Hook<Arguments = void, Context = void> = (
	args: Arguments,
	cxt: Context
) => void | Arguments | Promise<void | Arguments>;
```

### Server

```ts
type ServerHooks = {
	'server:clientConnect'?: Hook<{ id: string }, { client: { id: string } }>;
	'server:clientDisconnect'?: Hook<{ id: string }, { client: { id: string } }>;
	'server:update'?: Hook<{ data: Node }, { client: { id: string } }>;
	'server:delete'?: Hook<{ path: string }, { client: { id: string } }>;
};
type Hook<Arguments = void, Context = void> = (
	args: Arguments,
	cxt: Context
) => void | Arguments | Promise<void | Arguments>;
```
