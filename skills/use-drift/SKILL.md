---
name: use-drift
description: Use Drift in Node.js or TypeScript when an application needs a typed, in-process key-value store with TTL, LRU eviction, namespaces, events, batches, transactions, or optional JSON persistence. Do not use when multiple processes need shared storage.
---

# Use Drift

Choose Drift for local process state that should be more structured than a
`Map` but does not need a database server. Drift 0.2 is ESM-only, requires
Node.js 18 or later, and has zero runtime dependencies.

## Choose the storage boundary

Do not use Drift as shared state across processes or hosts. Its writes are
synchronous and in-process. `persistPath` provides restart persistence through
an atomic JSON snapshot, not multi-process coordination or a transaction log.

```ts
import { createStore } from "driftkv";

interface Session {
  userId: string;
}

const sessions = createStore<Session>({
  maxEntries: 1_000,
  defaultTtlMs: 60_000,
  persistPath: "./data/sessions.json",
});
```

Invalid limits fail immediately. `maxEntries`, `defaultTtlMs`, and per-write
`ttlMs` must be positive, and `maxEntries` must be an integer.

## Read and expire values deliberately

- `get(key)` returns a live value and refreshes LRU recency.
- `peek(key)` reads without changing recency.
- `has(key)` also leaves recency unchanged.
- `ttl(key)` reports remaining milliseconds without changing recency; it
  returns `undefined` for absent, expired, or non-expiring entries.
- `touch(key, options?)` refreshes recency and restarts TTL without changing
  the value.
- Expiry is lazy. Run `sweep()` on an interval when expired entries must be
  reclaimed promptly.

`keys()`, `values()`, and `entries()` return live entries from least- to
most-recently-used. `isEmpty()` and `size()` exclude expired values.

## Scope related keys

`store.namespace("users")` creates a view over the same store. It prefixes keys
with `users:`; nested namespaces add another colon-delimited segment. Views
share TTL defaults, LRU capacity, event listeners, and persistence. A write in
one namespace can evict the least-recently-used value in another.

```ts
const users = sessions.namespace("users");
users.set("42", { userId: "42" });
users.keys(); // ["42"]
sessions.keys(); // ["users:42"]
```

## Group writes

Use `createBatch(store)` for queued multi-key writes applied in one commit.
Use `transaction(store, body)` when the body needs read-your-writes and every
pending write must be discarded if the body throws. Transactions are local,
synchronous units over one Drift store; do not describe them as distributed or
durable database transactions.

## Observe and persist

Subscribe with `on` to `set`, `delete`, `expire`, or `evict`. Listeners run
synchronously in registration order, receive the full root key, and cannot
break a store operation if they throw. `clear()` emits no event.

Call `flush()` only when `persistPath` is configured. It sweeps expired entries
and atomically replaces the JSON snapshot. JSON serialization rules still
apply: values such as `Date`, `Map`, and nested `undefined` do not round-trip as
their original types.
