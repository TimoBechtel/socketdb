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
declare module '@socketdb/core' {
	export interface Meta {
		updated: Date;
	}
}
```

## Available hooks

### Client

```ts
type ClientHooks = {
	'client:set'?: Hook<{
		path: string;
		value: SchemaDefinition;
		meta?: Meta;
	}>;
	'client:delete'?: Hook<{ path: string }>;
	'client:firstConnect'?: Hook;
	'client:reconnect'?: Hook;
	'client:disconnect'?: Hook;
	/**
	 * Called before the client sends a heartbeat to the server.
	 *
	 * The payload coming from the server will be passed as a argument.
	 * Returned value will be sent to the server as heartbeat payload.
	 */
	'client:heartbeat'?: Hook<Record<string, unknown>>;
};
type Hook<Arguments = void, Context = void> = (args: Arguments, cxt: Context) => void | Arguments | Promise<void | Arguments>;
```

### Server

```ts
type ServerHooks = {
	/**
	 * Called when the server is initialized.
	 */
	'server:init'?: Hook<
		Record<string, never>,
		{
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:clientConnect'?: Hook<
		{ id: string },
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	/**
	 * Allows you to intercept the keep-alive check for a client.
	 *
	 * Throwing an error will skip the check and disconnect the client.
	 *
	 * Returned arguments will be sent to the client as a payload.
	 *
	 */
	'server:keepAliveCheck'?: Hook<
		Record<string, unknown>,
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	/**
	 * Allows you to verify the pong (heartbeat) response from the client.
	 *
	 * If you throw an error, the client will be disconnected. Otherwise, the client will be considered connected.
	 *
	 * You can use this to add additional checks, e.g. verify the client token expiration.
	 *
	 * Any payload sent by the client will be passed as arguments.
	 */
	'server:heartbeat'?: Hook<
		Record<string, unknown>,
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:clientDisconnect'?: Hook<
		{ id: string },
		{
			client: { id: string; context: SessionContext };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:update'?: Hook<
		{ data: Node<RecursivePartial<Schema>> },
		// if client id is null, it means the update comes from the server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
	'server:delete'?: Hook<
		{ path: string },
		// if client id is null, it means the deletion comes from the server
		{
			client: { id: string | null; context: SessionContext | null };
			api: SocketDBServerDataAPI<Schema>;
		}
	>;
};
type Hook<Arguments = void, Context = void> = (args: Arguments, cxt: Context) => void | Arguments | Promise<void | Arguments>;
```
