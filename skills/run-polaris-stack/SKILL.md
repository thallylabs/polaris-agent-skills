---
name: run-polaris-stack
description: Combine Flagpole feature evaluations with a bounded Drift cache in Node.js services when callers need resilient, low-latency flag reads without inventing behavior beyond either product's public contract.
---

# Run Polaris Stack

Use Flagpole as the source of feature decisions and Drift as an optional,
short-lived in-process cache. Keep the failure policy explicit: a cache can
reduce Flagpole traffic, but it also delays newly changed decisions.

## Define the cache policy first

Choose and document:

- a TTL short enough for the rollout's acceptable staleness;
- a bounded `maxEntries` for the service process;
- whether a Flagpole outage fails closed, uses a cached value, or applies an
  explicit application default; and
- whether persisted decisions are allowed to survive a process restart.

Do not persist evaluations by default. A feature decision can outlive its
intended rollout if a snapshot is restored after the flag changed.

## Cache evaluations by full decision identity

Include the flag key, stable unit, and environment in the cache key. Omitting
one of them can leak one cohort's decision into another.

```ts
import { createStore } from "driftkv";

const decisions = createStore<boolean>({
  maxEntries: 5_000,
  defaultTtlMs: 5_000,
}).namespace("flagpole-evaluations");

export async function isEnabled(input: {
  baseUrl: string;
  token?: string;
  flagKey: string;
  unit: string;
  environment?: string;
}): Promise<boolean> {
  const cacheKey = JSON.stringify([
    input.flagKey,
    input.unit,
    input.environment ?? null,
  ]);
  const cached = decisions.get(cacheKey);
  if (cached !== undefined) return cached;

  const query = new URLSearchParams({ unit: input.unit });
  if (input.environment) query.set("environment", input.environment);

  const response = await fetch(
    `${input.baseUrl}/v1/flags/${encodeURIComponent(input.flagKey)}/evaluate?${query}`,
    {
      headers: input.token
        ? { authorization: `Bearer ${input.token}` }
        : undefined,
    },
  );
  if (!response.ok) throw new Error(`Flagpole evaluation failed: ${response.status}`);

  const decision = (await response.json()) as { enabled: boolean };
  decisions.set(cacheKey, decision.enabled);
  return decision.enabled;
}
```

`get()` refreshes Drift's LRU recency but not its TTL. The cached decision
expires from its original write unless the application calls `touch()`.

## Invalidate honestly

Flagpole 1.0 records webhook delivery attempts but does not send them. Do not
claim that registering a Flagpole webhook automatically invalidates Drift.
Use a short TTL unless the application implements its own sender and receiver.
If it does, clear only keys for the changed flag or replace the process-local
cache. Remember that each process owns a separate Drift store.

## Verify the integration

Test at least these cases:

1. cache miss calls Flagpole and stores the decision;
2. repeated identity hits Drift without another HTTP request;
3. different unit or environment uses a different key;
4. TTL expiry causes a fresh Flagpole evaluation;
5. `401`, `404`, timeouts, and malformed responses follow the declared failure
   policy without exposing the bearer token; and
6. a disabled flag remains disabled regardless of percentage rollout.
