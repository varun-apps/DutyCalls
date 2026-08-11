-- ============================================================================
-- DutyCalls — 0002_rls.sql
-- Row-Level Security: members can only see/modify tasks within their groups.
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.tasks              enable row level security;
alter table public.invites            enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.activity_log       enable row level security;

-- ---------------------------------------------------------------- profiles
drop policy if exists "profiles sel own" on public.profiles;
create policy "profiles sel own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles upd own" on public.profiles;
create policy "profiles upd own" on public.profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------- groups
drop policy if exists "groups sel members" on public.groups;
create policy "groups sel members" on public.groups
  for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id and gm.user_id = auth.uid()
  ));

drop policy if exists "groups ins auth" on public.groups;
create policy "groups ins auth" on public.groups
  for insert with check (created_by = auth.uid());

-- ---------------------------------------------------------------- group_members
drop policy if exists "gm sel" on public.group_members;
create policy "gm sel" on public.group_members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- tasks
drop policy if exists "tasks sel members" on public.tasks;
create policy "tasks sel members" on public.tasks
  for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = tasks.group_id and gm.user_id = auth.uid()
  ));

drop policy if exists "tasks ins members" on public.tasks;
create policy "tasks ins members" on public.tasks
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = tasks.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "tasks upd members" on public.tasks;
create policy "tasks upd members" on public.tasks
  for update
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = tasks.group_id and gm.user_id = auth.uid()
  ));

drop policy if exists "tasks del members" on public.tasks;
create policy "tasks del members" on public.tasks
  for delete
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = tasks.group_id and gm.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------- invites
drop policy if exists "invites sel" on public.invites;
create policy "invites sel" on public.invites
  for select
  using (
    invited_by = auth.uid()
    or (select email from auth.users where id = auth.uid()) = invites.email
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = invites.group_id and gm.user_id = auth.uid()
        and gm.role = 'owner'
    )
  );

drop policy if exists "invites ins" on public.invites;
create policy "invites ins" on public.invites
  for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = invites.group_id and gm.user_id = auth.uid()
        and gm.role = 'owner'
    )
  );

-- ---------------------------------------------------------------- push_subscriptions
drop policy if exists "push sel own" on public.push_subscriptions;
create policy "push sel own" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push ins own" on public.push_subscriptions;
create policy "push ins own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push del own" on public.push_subscriptions;
create policy "push del own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- activity_log
drop policy if exists "activity sel members" on public.activity_log;
create policy "activity sel members" on public.activity_log
  for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = activity_log.group_id and gm.user_id = auth.uid()
  ));
