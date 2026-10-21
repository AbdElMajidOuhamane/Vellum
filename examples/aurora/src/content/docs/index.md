---
title: Aurora
description: A tiny event bus for JavaScript with no dependencies and no ceremony.
layout: splash
hero:
  eyebrow: Event bus
  tagline: Publish events, subscribe anywhere, and keep your modules decoupled. Aurora is a tiny event bus with a small, predictable API.
  image: /aurora.svg
  imageAlt: Aurora logo
  actions:
    - text: Install Aurora
      link: /guide/installation/
      variant: primary
    - text: Read the API
      link: /reference/api/
      variant: secondary
features:
  - title: Tiny
    description: One event bus, one file, no dependencies.
  - title: Predictable
    description: Listeners run synchronously in subscription order.
  - title: Flexible
    description: Exact channels, wildcard channels, and one-shot listeners.
  - title: Portable
    description: Plain ES modules that run in Fairyfly, Node, and the browser.
---

## Why Aurora

Aurora is a single class with typed channels, wildcard listeners, and no runtime
dependencies. It is small enough to read in one sitting and useful enough to
replace ad-hoc callback plumbing.

## Quick start

```js
import { createBus } from "aurora-events";

const bus = createBus();

bus.on("user:created", (user) => {
  console.log("welcome", user.name);
});

bus.emit("user:created", { name: "Ada" });
// welcome Ada
```

## What it looks like

| Piece | Purpose |
| --- | --- |
| `createBus()` | Create an isolated bus |
| `bus.on(channel, fn)` | Subscribe |
| `bus.once(channel, fn)` | Subscribe for one event |
| `bus.off(channel, fn)` | Unsubscribe |
| `bus.emit(channel, payload)` | Publish synchronously |

```js
const bus = createBus();
const unsubscribe = bus.on("build:done", () => console.log("done"));

bus.emit("build:done");
unsubscribe();
```

> [!TIP]
> Start with [Installation](/guide/installation/) if you want the package, or go
> straight to [Usage](/guide/usage/) for the event patterns.
