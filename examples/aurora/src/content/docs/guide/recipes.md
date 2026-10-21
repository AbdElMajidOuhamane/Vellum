---
title: Recipes
description: Small patterns for wildcard routing, cleanup, and testing.
order: 3
---

# Recipes

## Route events by prefix

A single wildcard listener can forward a family of events to a logger:

```js
bus.on("job:*", (payload, channel) => {
  console.log(channel, payload);
});

bus.emit("job:started", { id: 1 });
bus.emit("job:finished", { id: 1, ok: true });
```

## Keep cleanup explicit

Return the unsubscribe function from setup code:

```js
function trackClicks(bus, onClick) {
  return bus.on("ui:click", onClick);
}

const stop = trackClicks(bus, () => console.log("click"));
stop();
```

## Test a listener in isolation

```js
import { test } from "./test-helpers.js";
import { createBus } from "aurora-events";

test("emits the payload", () => {
  const bus = createBus();
  const seen = [];

  bus.on("value", (value) => seen.push(value));
  bus.emit("value", 42);

  assert.equal(seen[0], 42);
});
```

## Choose the right channel

| Need | Channel style |
| --- | --- |
| One specific step | `deploy:finished` |
| A family of steps | `deploy:*` |
| Everything, for debugging | `*` |

> [!CAUTION]
> Wildcard listeners run for every matching event. Keep their bodies cheap, and do
> not use `*` in production without a reason.

## Avoid

- Mutating the payload in a listener so later listeners see different data.
- Emitting the same event from a listener without a stop condition.
- Using an event bus for request/response; return a value from a function instead.

Back to [Usage](/guide/usage/) or the [API reference](/reference/api/).
