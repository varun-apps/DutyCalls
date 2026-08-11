# ADR-0005: Task status enum — start / in_progress / complete

## Status

Accepted

## Context

Tasks need a bounded lifecycle. The product spec requires three statuses.

## Decision

Use a Postgres enum `task_status` with values `start`, `in_progress`, `complete`.
Default is `start`. A trigger maintains `completed_at` (set on transition to `complete`,
cleared otherwise). The UI cycles `start → in_progress → complete → start`.

## Rationale

- Matches the spec exactly.
- An enum prevents invalid values at the database level (vs. a free-text column).
- `completed_at` enables reporting/completion timestamps without app-side logic.

## Note

`start` was the customer's chosen label (the verb reads as "to start"). If a clearer
label is later preferred, `start` → `todo` is a one-line migration + UI update.

## Consequences

- Adding a status is a migration (enum alter) — intentional friction, since this should
  be rare.
