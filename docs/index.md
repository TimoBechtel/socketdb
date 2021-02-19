---
home: true
title: SocketDB
heroImage: /hero.png
image: /hero.png
tagline: Easy to use data storage that syncs across browsers in realtime.
description: Easy to use data storage that syncs across browsers in realtime.
actionText: Quick Start →
actionLink: /guide/quick-start
footer: MIT Licensed | Copyright © Timo Bechtel
---

<!-- prettier-ignore -->
```js
db.get('some').get('path').on(console.log);

db.get('some').set({ path: 'Hello World' });
// => Hello World
```

## What this is

SocketDB is an easy to use data storage that syncs across browsers in realtime
and allows you to focus on your application without worrying about networking.

It features:

- minimal network overhead: caches data and only syncs changes
- batches changes to reduce transmitted data
- automatically reconnects on connection lost
- full typescript support
