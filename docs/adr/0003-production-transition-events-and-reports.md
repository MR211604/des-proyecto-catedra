# ADR 0003: Production transition events and owner reports

## Status

Accepted

## Context

The workshop needs owner-only statistics and reports for operations, production,
sales, payments, inventory, customers, and quotes. Production reports also need
reliable blocked-time information, but the existing production event history
only represented stage changes.

## Decision

Production events are append-only operational transition records with one of
three types: `STAGE_MOVED`, `BLOCKED`, or `UNBLOCKED`. Block and unblock
transitions retain the job's current stage as their stage context. Existing
events remain stage movements through a default value; no synthetic history is
created for records that predate the migration. The production-job relation
restricts deletion while events exist, so aggregate deletion cannot silently
remove the transition history.

The backend exposes owner-only report endpoints under `/api/v1/reports`, with
JSON and synchronous PDF representations. Reports use live queries, explicit
date periods in the workshop timezone (`America/El_Salvador`), and USD for
monetary values.

## Consequences

- Blocked and active production time can be calculated for transitions recorded
  after the migration.
- Existing jobs remain readable, but historical blocked duration is unavailable
  when the corresponding events do not exist.
- Reports do not require a separate snapshot or reporting database yet.
- PDF generation is synchronous and should remain limited to the requested
  report size.
