-- ============================================================================
-- DutyCalls — 0001_init.sql
-- Core schema: profiles, groups, group_members, tasks, invites,
-- push_subscriptions, activity_log.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.task_status as enum ('start', 'in_progress', 'complete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.group_member_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Groups (a shared space / household)
-- ----------------------------------------------------------------------------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Group membership (the sharing primitive)
-- ----------------------------------------------------------------------------
create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      public.group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Tasks (daily todos)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  title        text not null,
  description  text,
  status       public.task_status not null default 'start',
  task_date    date not null,
  created_by   uuid not null references public.profiles(id),
  assigned_to  uuid references public.profiles(id),
  position     int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Invitations (wife invites husband by email)
-- ----------------------------------------------------------------------------
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  email      text not null,
  invited_by uuid not null references public.profiles(id),
  status     public.invite_status not null default 'pending',
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Push subscriptions (Web Push endpoints)
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Activity log (notification history, optional)
-- ----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  task_id    uuid references public.tasks(id) on delete set null,
  actor_id   uuid not null references public.profiles(id),
  event_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_tasks_group_date    on public.tasks (group_id, task_date);
create index if not exists idx_tasks_status         on public.tasks (status);
create index if not exists idx_group_members_user  on public.group_members (user_id);
create index if not exists idx_invites_email_status on public.invites (email, status);
create index if not exists idx_push_subs_user       on public.push_subscriptions (user_id);
create unique index if not exists uniq_push_user_endpoint
  on public.push_subscriptions (user_id, endpoint);
create index if not exists idx_activity_group       on public.activity_log (group_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Trigger: keep tasks.updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Trigger: maintain tasks.completed_at based on status
-- ----------------------------------------------------------------------------
create or replace function public.maintain_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'complete' and (old.status is distinct from 'complete') then
    new.completed_at = now();
  elsif new.status <> 'complete' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_maintain_completed_at on public.tasks;
create trigger tasks_maintain_completed_at
  before update on public.tasks
  for each row execute function public.maintain_completed_at();

-- ----------------------------------------------------------------------------
-- Trigger: auto-create a profile when a new auth user signs up
-- (covers email/password, magic link, Google, Apple — all go through auth.users)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Realtime: broadcast changes so collaborators stay in sync
-- ----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.group_members;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.invites;
exception when duplicate_object then null; end $$;

