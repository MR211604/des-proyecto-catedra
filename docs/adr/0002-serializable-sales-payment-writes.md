# Serializable sales and payment writes

Sales and payment changes use PostgreSQL serializable transactions with limited automatic retries instead of a queue. The workshop API must return an immediate, authoritative outstanding balance and reject overpayments even when users register payments concurrently; a queue would make that result eventual and ambiguous.

## Consequences

- Payment writes may return `409 Conflict` after repeated serialization conflicts, so the client can retry deliberately.
- Payment totals and sale status are recalculated in the same transaction.
- Introducing asynchronous processing later would require an explicit idempotency and reconciliation design.
