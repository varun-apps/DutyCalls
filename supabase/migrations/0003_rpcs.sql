-- ============================================================================
-- DutyCalls — 0003_rpcs.sql
-- SECURITY DEFINER functions used by the client (auth.uid() validated inside).
-- ============================================================================

-- Ensure the current user has at least one group; create a default if not.
create or replace function public.ensure_default_group()
returns uuid
language plpgsql
security definer set search_path = public as $$
declare gid uuid;
begin
  select gm.group_id into gid
  from public.group_members gm
  where gm.user_id = auth.uid()
  order by gm.joined_at asc
  limit 1;

  if gid is null then
    insert into public.groups (name, created_by) values ('My Tasks', auth.uid())
    returning id into gid;
    insert into public.group_members (group_id, user_id, role)
    values (gid, auth.uid(), 'owner');
  end if;

  return gid;
end;
$$;

-- Create a new group; the caller becomes the owner.
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer set search_path = public as $$
declare gid uuid;
begin
  insert into public.groups (name, created_by) values (p_name, auth.uid())
  returning id into gid;
  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'owner');
  return gid;
end;
$$;

-- Create an invite (group owners only).
create or replace function public.create_invite(p_group_id uuid, p_email text)
returns uuid
language plpgsql
security definer set search_path = public as $$
declare inv_id uuid;
begin
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
      and gm.role = 'owner'
  ) then
    raise exception 'Not allowed: only group owners can invite';
  end if;

  insert into public.invites (group_id, email, invited_by)
  values (p_group_id, lower(trim(p_email)), auth.uid())
  returning id into inv_id;

  return inv_id;
end;
$$;

-- Accept an invite (logged-in user whose email matches the invite).
create or replace function public.accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public as $$
declare inv record;
  caller_email text;
begin
  select email into caller_email from auth.users where id = auth.uid();

  select * into inv from public.invites
  where token = p_token and status = 'pending';

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if caller_email is distinct from inv.email then
    raise exception 'This invite was sent to a different email';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (inv.group_id, auth.uid(), 'member')
  on conflict do nothing;

  update public.invites set status = 'accepted' where id = inv.id;

  return inv.group_id;
end;
$$;

-- Register a Web Push subscription for the current user.
create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth_key text
)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth_key)
  on conflict (user_id, endpoint) do update
    set p256dh = excluded.p256dh, auth_key = excluded.auth_key;
end;
$$;
