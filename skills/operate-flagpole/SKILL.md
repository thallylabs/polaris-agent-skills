---
name: operate-flagpole
description: Operate the Flagpole feature-flag HTTP API when creating, evaluating, segmenting, auditing, or deleting flags, environments, tags, and webhook subscriptions. Do not use for unrelated feature-flag products.
---

# Operate Flagpole

Use Flagpole through HTTP. It has no client SDK or hosted dashboard, so prefer
small, inspectable requests and verify every mutation with a read.

## Establish the target

Obtain the base URL and, when configured, a bearer token. Never print or commit
the token. Start with the public probes:

```bash
curl -fsS "$FLAGPOLE_URL/health"
curl -fsS "$FLAGPOLE_URL/version"
```

Flagpole 1.0 requires Node.js 20 when self-hosted. `GET /health` and
`GET /version` are public; `/v1` routes require
`Authorization: Bearer $FLAGPOLE_API_TOKEN` only when the server has a token.
Treat an unset server token as local-development mode, not a safe production
configuration.

## Manage a rollout

Create flags with immutable keys. Keys allow letters, numbers, `.`, `-`, and
`_`; `rolloutPercentage` is an integer from 0 through 100.

```bash
curl -fsS -X POST "$FLAGPOLE_URL/v1/flags" \
  -H "Authorization: Bearer $FLAGPOLE_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"key":"new-checkout","enabled":true,"rolloutPercentage":10,"tags":["checkout","beta"]}'
```

Evaluate a stable unit with
`GET /v1/flags/:key/evaluate?unit=<stable-id>`. Bucketing is deterministic,
and `enabled` remains the master switch. Add `environment=<key>` only when an
environment override should replace the flag's default state or percentage.

Use `PATCH /v1/flags/:key` for field changes,
`POST /v1/flags/:key/toggle` only for an intentional boolean flip, and
`GET /v1/flags/:key/history?limit=<1..500>` for the durable change trail.
History survives flag deletion.

## Use tags and environments

- A flag accepts at most 10 unique lowercase kebab-case tags.
- `PUT` or `DELETE /v1/flags/:key/tags/:tag` changes one tag idempotently.
- `DELETE /v1/tags/:tag` removes that tag from every flag. Confirm the scope
  before using it.
- `development`, `staging`, and `production` exist initially.
- `PUT /v1/flags/:key/environments/:environment` sets an `enabled` and/or
  `rolloutPercentage` override. Deleting a flag also clears its overrides.

## Work with webhooks

Webhook subscription URLs must use HTTPS. A subscription can select
`flag.created`, `flag.updated`, `flag.deleted`, and `tag.retired` events.
Flagpole records delivery attempts but does not send them; the caller owns the
transport. Use `POST /v1/webhooks/:id/test` to record a test delivery, then
inspect `GET /v1/webhooks/:id/deliveries` with optional `status` and `limit`
filters. Never claim that a downstream endpoint received a request.

## Verify mutations

After a write, read the affected flag, environment override, tag list, webhook,
or history endpoint. Report Flagpole's uniform error code from
`{ "error": { "code", "message" } }` without exposing credentials. Do not
retry `409 flag_exists` as though the create were idempotent; read the existing
flag and reconcile intent first.
