# ADR-0003: Group-based sharing model enforced by RLS

## Status

Accepted

## Context

Users need to share a todo list with specific people (e.g. a couple sharing one list).
The system must answer two questions: *who can see a list?* and *how does a new person
join?*

## Decision

- A **group** is the sharing boundary. Every task belongs to exactly one group.
- `group_members(group_id, user_id, role)` records membership.
- **RLS** on `tasks`, `groups`, `group_members`, `invites` requires the caller to be a
  member of the task's group for any read or write.
- Joining is **explicit**: a group **owner** invites by email via the `create_invite`
  RPC; the invitee accepts via `accept_invite(token)` (the logged-in user's email must
  match the invited email).
- Every new user gets a personal default group ("My Tasks") on first login via
  `ensure_default_group()`.

## Rationale

- Explicit, owner-initiated invites are secure and match the "wife invites husband" flow.
- A group can hold any number of members (couples, families, small teams) without schema
  change.
- RLS means even direct API calls cannot leak data across groups.

## Considered alternatives

- **Per-user sharing / per-task ACLs**: more flexible but far more complex and error-prone.
- **Auto-share by email domain**: insecure for a personal/family app.

## Consequences

- A user sees only groups they belong to (queried via their `group_members` rows).
- Removing a member = deleting their `group_members` row (cascades correctly).
