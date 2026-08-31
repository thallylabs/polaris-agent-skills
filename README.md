# Polaris Labs agent skills

Public Codex skills for working with the two Polaris Labs products:

- `operate-flagpole` manages feature flags through the Flagpole HTTP API.
- `use-drift` adds an embedded, zero-dependency key-value store to Node.js code.
- `run-polaris-stack` combines Flagpole decisions with a short-lived Drift cache.

Install the repository with your agent's skill installer, or copy one folder
from `skills/` into your local skills directory. Each skill is independent and
contains its own discovery metadata.

## Source of truth

The skills describe the released behavior in
[`kenny-io/flagpole-api`](https://github.com/kenny-io/flagpole-api) and
[`kenny-io/driftkv`](https://github.com/kenny-io/driftkv). Product behavior
belongs in those repositories. This repository is a consumer-facing knowledge
surface and should change only when the product contract changes.

## Validate

```bash
npm test
```

Set `POLARIS_SKILL_VALIDATOR` to Codex's `quick_validate.py` path to use the
canonical validator. CI also runs a portable structural fallback.

## License

MIT
