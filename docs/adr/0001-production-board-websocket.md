# ADR 0001: Production Board WebSocket Notifications

## Status

Accepted

## Context

The Production Board is shared by workshop users and must become stale promptly after a Job or Stage mutation. Polling introduces unnecessary requests and delayed updates. SSE provides one-way delivery, but the application already needs a reconnectable bidirectional connection boundary and WebSockets are supported by the backend runtime and browser clients.

## Decision

The backend exposes an authenticated WebSocket on the same HTTP server. Clients send the Clerk session token in the subprotocol `clerk.<session-token>`. Invalid or missing credentials are rejected during the upgrade. Every authenticated connection receives every production notification for the workshop; there are no Order or other subscriptions.

The notification is an invalidation, not a second source of truth:

```json
{
  "type": "production.changed",
  "operation": "production.job.moved",
  "actorId": "user_123",
  "occurredAt": "2026-09-06T12:00:00.000Z",
  "context": {
    "job": { "id": "job_123" },
    "order": { "id": "order_123" },
    "stage": { "id": "stage_456" }
  }
}
```

`context` contains only the entities affected by the operation. The client uses the event to re-fetch the canonical Production Board REST resource. Events are published only after the mutation transaction resolves successfully. A disconnected client does not affect the mutation and can recover by fetching the Board after reconnecting.

## Alternatives considered

- Polling: simpler, but delayed and wasteful when the Board is idle.
- SSE: suitable for one-way notifications, but WebSockets provide the selected connection boundary and leave room for future authenticated workshop notifications without changing transports.
