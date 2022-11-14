# Write plugins

SocketDB can be extended using plugins.

See a list of already available plugins [here](plugins).

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

:::tip Plugin implementation
Plugins are implemented using the `krog` library. Check out its [documentation](https://github.com/TimoBechtel/krog) to learn more.
:::

If your plugins middleware returns a value, this value will be passed to the next plugin
and finally processed internally instead of the initial arguments.

## Extending Types (typescript)

You might want to extend the internal meta data type definition with your plugin meta definitions to provide type checking.

For example:

`extension.d.ts`

```ts
declare module '@socketdb/client' {
	export interface Meta {
		updated: Date;
	}
}
```

## Available hooks

### Client

```ts
type ClientHooks = {
	'client:set'?: Hook<{ path: string; value: any; meta?: Meta }>;
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
	'server:clientConnect'?: Hook<
		{ id: string },
		{ client: { id: string; context: SessionContext }; api: SocketDBServerAPI }
	>;
	'server:clientDisconnect'?: Hook<
		{ id: string },
		{ client: { id: string; context: SessionContext }; api: SocketDBServerAPI }
	>;
	'server:update'?: Hook<
		{ data: Node },
		// if client id is null, it means the update comes from the server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerAPI;
		}
	>;
	'server:delete'?: Hook<
		{ path: string },
		// if client id is null, it means the deletion comes from the server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerAPI;
		}
	>;
};
type Hook<Arguments = void, Context = void> = (
	args: Arguments,
	cxt: Context
) => void | Arguments | Promise<void | Arguments>;
```
