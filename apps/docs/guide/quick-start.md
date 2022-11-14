# Quick Start

## Setup Server

Create new project:

<code-group>
<code-block title="PNPM">
```bash
mkdir myserver && cd myserver
pnpm init
pnpm add @socketdb/server
```
</code-block>

<code-block title="NPM">
```bash
mkdir myserver && cd myserver
npm init
npm install @socketdb/server
```
</code-block>

</code-group>

Create `index.js` file with:

```js
import { SocketDBServer } from '@socketdb/server';

SocketDBServer({ port: 8080 });
```

Run it with `node index.js`.

## Setup Client

<code-group>
<code-block title="PNPM">
```bash
pnpm add @socketdb/client
```
</code-block>

<code-block title="NPM">
```bash
npm install @socketdb/client
```
</code-block>

</code-group>

> To use SocketDB, you need to setup your frontend with a bundler (like [rollup](https://rollupjs.org/)) that bundles your node_modules.

Then you can just import the client:

```js
import { SocketDBClient } from '@socketdb/client';
```

## Start client & connect to server

Then, in your frontend javascript, you can connect to the server like this:

```js
const db = SocketDBClient({ url: 'ws://localhost:8080' });

db.get('some').get('path').on(console.log);
db.get('some').set({ path: 'Hello World' });
```

:::tip Typescript
SocketDB has full typescript support. I recommend using typescript with SocketDB
to get the benefits of code completion and type checking.
For example you can add a [Data Schema](client#data-schema).
:::
