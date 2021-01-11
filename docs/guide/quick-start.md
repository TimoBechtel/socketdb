# Quick Start

## Prequesites

SocketDB requires NodeJS.

## Installation

:::warning Note
Currently SocketDB is only distributed as a node module, so you can not simply link it in your html file.
Instead it is recommended to use a bundler, like [RollupJS](https://rollupjs.org/) for your frontend application.
:::

For both client and server:

<ClientOnly>
<code-group>
<code-block title="YARN">
```bash
yarn add socketdb
```
</code-block>

<code-block title="NPM">
```bash
npm install socketdb
```
</code-block>

</code-group>
</ClientOnly>

## Setup Server

Create `index.js` file with:

```js
import { SocketDBServer } from 'socketdb';

SocketDBServer({ port: 8080 });
```

Run it with `node index.js`

## Setup Client

In your frontend javascript, you can connect to the server like this:

```js
import { SocketDBClient } from 'socketdb';

const db = SocketDBClient({ url: 'ws://localhost:8080' });

db.get('some')
	.get('path')
	.on(console.log);
db.get('some').set({ path: 'Hello World' });
```
