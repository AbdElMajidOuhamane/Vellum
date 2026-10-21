---
title: Usage
description: Subscribe, publish, unsubscribe, and use wildcard channels.
order: 2
---

# Usage

## Channels

Every event travels on a string channel. Channels are exact matches unless you use
`*` at the end.

```js
const bus = createBus();

bus.on("user:created", (user) => {
  console.log("new user", user.id);
});

bus.on("user:*", (payload, channel) => {
  console.log("user event", channel, payload);
});

bus.emit("user:created", { id: 7 });
// new user 7
// user event user:created { id: 7 }
```

## One-shot listeners

`once` removes the listener before it runs:

```js
bus.once("app:ready", () => {
  console.log("this runs once");
});

bus.emit("app:ready");
bus.emit("app:ready"); // nothing
```

## Unsubscribing

`on` and `once` return an unsubscribe function. You can also pass the original
listener to `off`.

```js
function onSave(event) {
  console.log("saved", event.id);
}

bus.on("save", onSave);
bus.off("save", onSave);

const stop = bus.on("save", () => console.log("temporary"));
stop();
```

## Emit return value

`emit` returns the number of listeners that ran. This is useful for assertions and
debugging:

```js
const count = bus.emit("cache:clear");
console.log(count); // 0, 1, 2, ...
```

> [!WARNING]
> A listener that throws stops the remaining listeners for that event. Wrap risky
> listener code in `try`/`catch` if you need isolation.

## Summary

| Method | Returns | Notes |
| --- | --- | --- |
| `bus.on` | unsubscribe function | Runs on every matching event |
| `bus.once` | unsubscribe function | Runs at most once |
| `bus.off` | `boolean` | `true` when a listener was removed |
| `bus.emit` | number | Count of listeners that ran |
| `bus.clear` | `void` | Removes all listeners |

Continue with [Recipes](/guide/recipes/) or the [API reference](/reference/api/).
