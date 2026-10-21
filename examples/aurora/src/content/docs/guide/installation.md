---
title: Installation
description: Add Aurora to a project and create your first event bus.
order: 1
---

# Installation

Aurora is a pure ES module. It has no runtime dependencies and no build step.

```sh
npm install aurora-events
```

Then import it:

```js
import { createBus } from "aurora-events";

const bus = createBus();
console.log(typeof bus.emit); // "function"
```

## Environments

| Environment | Import style |
| --- | --- |
| Fairyfly | `import { createBus } from "aurora-events";` |
| Node.js ESM | `import { createBus } from "aurora-events";` |
| Browser ESM | `import { createBus } from "/vendor/aurora.js";` |

> [!NOTE]
> Aurora is an ES module. CommonJS `require()` is not supported.

## Your first bus

```js
import { createBus } from "aurora-events";

const bus = createBus();

bus.on("ready", () => {
  console.log("ready");
});

bus.emit("ready");
```

The listener runs synchronously, before `emit` returns. If you need asynchronous
work, start it inside the listener or wrap the emit in a microtask.

## Next

- [Usage](/guide/usage/) — channels, wildcards, and one-shot listeners.
- [Recipes](/guide/recipes/) — common patterns.
- [API reference](/reference/api/) — every method.
