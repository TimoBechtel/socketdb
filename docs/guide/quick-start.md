# Quick Start

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

## Setup Server

Create new project:

<code-group>
<code-block title="YARN">
```bash
mkdir myserver && cd myserver
yarn init
yarn add socketdb
```
</code-block>

<code-block title="NPM">
```bash
mkdir myserver && cd myserver
npm init
npm install socketdb
```
</code-block>

</code-group>

Create `index.js` file with:

```js
import { SocketDBServer } from 'socketdb';

SocketDBServer({ port: 8080 });
```

Run it with `node index.js`.

## Setup Client

There are two ways you can use SocketDB.

### Using script tag

Download `SocketDBClient minified UMD` from latest [release](https://github.com/TimoBechtel/socketdb/releases).

Link it in your html head:

```html
<script src="SocketDBClient-VERSION_NUMBER.min.js"></script>
```

This will expose the `SocketDBClient` globally.

### As npm module (recommended)

To use SocketDB as a module, you need to setup your frontend with a bundler (like [rollup](https://rollupjs.org/)) that bundles your node_modules.

Then you can just import the browser version:

```js
import { SocketDBClient } from 'socketdb/browser';
```

## Start client

Then, in your frontend javascript, you can connect to the server like this:

```js
const db = SocketDBClient({ url: 'ws://localhost:8080' });

db.get('some').get('path').on(console.log);
db.get('some').set({ path: 'Hello World' });
```

:::tip Typescript
SocketDB has full typescript support. I recommend using typescript with SocketDB
to get the benefits of code completion and type checking.
:::
