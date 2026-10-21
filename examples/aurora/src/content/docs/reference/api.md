---
title: API reference
description: Every Aurora method, parameter, and return value.
order: 1
---

# API reference

## `createBus()`

Creates an isolated bus. Buses do not share listeners.

```js
import { createBus } from "aurora-events";
const bus = createBus();
```

Returns a bus with the methods below.

## `bus.on(channel, listener)`

Subscribes a listener and returns an unsubscribe function.

```js
bus.on(channel, listener);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `channel` | string | Exact channel or a trailing `*` wildcard |
| `listener` | function | Receives `(payload, channel)` |

The same listener can be registered twice; both registrations run. `off` removes
one registration per call.

## `bus.once(channel, listener)`

Like `on`, but removes the listener before it runs.

```js
bus.once("app:ready", () => console.log("once"));
```

## `bus.off(channel, listener)`

Removes one matching registration.

```js
const removed = bus.off("app:ready", listener);
```

Returns `true` when a listener was removed, otherwise `false`.

## `bus.emit(channel, payload)`

Runs matching listeners synchronously in subscription order.

```js
const count = bus.emit("app:ready", { at: Date.now() });
```

Returns the number of listeners that ran.

## `bus.clear()`

Removes every listener from the bus.

```js
bus.clear();
```

## Types

```ts
type Listener<T = unknown> = (payload: T, channel: string) => void;

interface Bus {
  on<T>(channel: string, listener: Listener<T>): () => void;
  once<T>(channel: string, listener: Listener<T>): () => void;
  off<T>(channel: string, listener: Listener<T>): boolean;
  emit<T>(channel: string, payload?: T): number;
  clear(): void;
}
```

> [!TIP]
> The API is deliberately small. If you need request/response or persistence, use
> a dedicated library instead of layering it onto the bus.

See [Usage](/guide/usage/) for end-to-end examples.
