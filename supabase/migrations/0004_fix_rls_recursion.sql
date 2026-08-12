-- ============================================================================
-- DutyCalls — 0004_fix_rls_recursion.sql
-- Fix infinite recursion in the group_members RLS policy + add missing grants.
--
-- Root cause: the "gm sel" policy on public.group_members referenced
-- public.group_members inside an EXISTS subquery. Evaluating visibility of a
-- row therefore queried group_members again, which is itself protected by the
-- same policy -> infinite recursion (PostgreSQL 42P17). Because the groups,
-- tasks, invites and activity_log policies all do
-- `EXISTS (select 1 from group_members ...)`, every membership-gated query
-- failed with a 500 — so the client could never load the user's groups,
-- `groupId` stayed null, and the Add-task / Invite buttons never rendered.
--
-- Fix: route every membership check through SECURITY DEFINER helper functions
-- that bypass RLS (no self-reference, no recursion). Also GRANT the API roles
-- (anon, authenticated) access to the public tables — `profiles` was missing
-- SELECT, which broke the group_members <-> profiles join in useGroupMembers.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER -> run as owner, bypass RLS).
-- Stable + pinned search_path for safety.
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

-- Execute only for the API roles (not PUBLIC).
revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_owner(uuid) from public;
grant execute on function public.is_group_member(uuid) to anon, authenticated;
grant execute on function public.is_group_owner(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- group_members: see your own row, or other members of a group you belong to.
-- (No self-reference -> no recursion.)
-- ---------------------------------------------------------------------------
drop policy if exists "gm sel" on public.group_members;
create policy "gm sel" on public.group_members
  for select
  using (
    user_id = auth.uid()
    or public.is_group_member(group_members.group_id)
  );

-- ---------------------------------------------------------------------------
-- groups: select groups you belong to; create groups you own.
-- ---------------------------------------------------------------------------
drop policy if exists "groups sel members" on public.groups;
create policy "groups sel members" on public.groups
  for select
  using (public.is_group_member(groups.id));

drop policy if exists "groups ins auth" on public.groups;
create policy "groups ins auth" on public.groups
  for insert
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- tasks: full CRUD for members of the owning group.
-- ---------------------------------------------------------------------------
drop policy if exists "tasks sel members" on public.tasks;
create policy "tasks sel members" on public.tasks
  for select
  using (public.is_group_member(tasks.group_id));

drop policy if exists "tasks ins members" on public.tasks;
create policy "tasks ins members" on public.tasks
  for insert
  with check (
    created_by = auth.uid()
    and public.is_group_member(tasks.group_id)
  );

drop policy if exists "tasks upd members" on public.tasks;
create policy "tasks upd members" on public.tasks
  for update
  using (public.is_group_member(tasks.group_id));

drop policy if exists "tasks del members" on public.tasks;
create policy "tasks del members" on public.tasks
  for delete
  using (public.is_group_member(tasks.group_id));

-- ---------------------------------------------------------------------------
-- invites: owners manage invites; invitees can see their own pending invite.
-- Use auth.jwt()->>'email' instead of querying auth.users (avoids permission
-- issues for the anon/authenticated roles on the auth schema).
-- ---------------------------------------------------------------------------
drop policy if exists "invites sel" on public.invites;
create policy "invites sel" on public.invites
  for select
  using (
    invited_by = auth.uid()
    or coalesce(auth.jwt() ->> 'email', '') = invites.email
    or public.is_group_owner(invites.group_id)
  );

drop policy if exists "invites ins" on public.invites;
create policy "invites ins" on public.invites
  for insert
  with check (
    invited_by = auth.uid()
    and public.is_group_owner(invites.group_id)
  );

-- ---------------------------------------------------------------------------
-- activity_log: members can read activity for their groups.
-- ---------------------------------------------------------------------------
drop policy if exists "activity sel members" on public.activity_log;
create policy "activity sel members" on public.activity_log
  for select
  using (public.is_group_member(activity_log.group_id));

-- ---------------------------------------------------------------------------
-- Grants: ensure the API roles can access the public schema + its tables.
-- (profiles was missing SELECT -> "permission denied for table profiles".)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to anon, authenticated;

grant select on public.groups to anon, authenticated;
grant insert on public.groups to anon, authenticated;

grant select on public.group_members to anon, authenticated;
grant insert on public.group_members to anon, authenticated;
grant delete on public.group_members to anon, authenticated;

grant select on public.tasks to anon, authenticated;
grant insert on public.tasks to anon, authenticated;
grant update on public.tasks to anon, authenticated;
grant delete on public.tasks to anon, authenticated;

grant select on public.invites to anon, authenticated;
grant insert on public.invites to anon, authenticated;
grant update on public.invites to anon, authenticated;

grant select on public.activity_log to anon, authenticated;
grant insert on public.activity_log to anon, authenticated;
