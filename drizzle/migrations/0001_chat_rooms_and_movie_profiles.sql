create extension if not exists pgcrypto with schema extensions;

-- ---------- Chat ----------
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  kind text not null check (kind in ('global', 'public', 'private')),
  passkey_hash text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check ((kind = 'private') = (passkey_hash is not null))
);
create unique index chat_rooms_name_unique on public.chat_rooms (lower(name));

create table public.chat_members (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null,
  primary key (room_id, user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_room_time on public.chat_messages (room_id, created_at);

create table public.chat_reactions (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null,
  author text not null,
  emoji text not null check (char_length(emoji) <= 16),
  primary key (message_id, user_id, emoji)
);

grant select (id, name, kind, created_by, created_at) on public.chat_rooms to authenticated;
grant all on public.chat_rooms to service_role;
grant select on public.chat_members to authenticated;
grant all on public.chat_members to service_role;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
grant select, insert, delete on public.chat_reactions to authenticated;
grant all on public.chat_reactions to service_role;

create or replace function public.is_room_member(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_members where room_id = rid and user_id = auth.uid());
$$;

create or replace function public.can_read_room(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id = rid and (r.kind <> 'private' or public.is_room_member(r.id))
  );
$$;

alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;

create policy "rooms visible if not private or member" on public.chat_rooms
  for select to authenticated using (kind <> 'private' or public.is_room_member(id));
create policy "members see own" on public.chat_members
  for select to authenticated using (user_id = auth.uid());
create policy "messages read" on public.chat_messages
  for select to authenticated using (public.can_read_room(room_id));
create policy "messages write own" on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid() and public.can_read_room(room_id));
create policy "reactions read" on public.chat_reactions
  for select to authenticated using (exists (select 1 from public.chat_messages m where m.id = message_id and public.can_read_room(m.room_id)));
create policy "reactions add own" on public.chat_reactions
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.chat_messages m where m.id = message_id and public.can_read_room(m.room_id)));
create policy "reactions remove own" on public.chat_reactions
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.create_chat_room(p_name text, p_private boolean, p_passkey text default null)
returns table (id uuid, name text, kind text)
language plpgsql security definer set search_path = public, extensions as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_private and (p_passkey is null or char_length(p_passkey) < 4) then
    raise exception 'passkey must be at least 4 characters';
  end if;
  insert into public.chat_rooms (name, kind, passkey_hash, created_by)
  values (trim(p_name), case when p_private then 'private' else 'public' end,
          case when p_private then extensions.crypt(p_passkey, extensions.gen_salt('bf')) end, auth.uid())
  returning chat_rooms.id into rid;
  insert into public.chat_members (room_id, user_id) values (rid, auth.uid());
  return query select r.id, r.name, r.kind from public.chat_rooms r where r.id = rid;
end $$;

create or replace function public.join_private_room(p_name text, p_passkey text)
returns table (id uuid, name text, kind text)
language plpgsql security definer set search_path = public, extensions as $$
declare r public.chat_rooms;
begin
  if auth.uid() is null then return; end if;
  select * into r from public.chat_rooms c where lower(c.name) = lower(trim(p_name)) and c.kind = 'private';
  if not found or r.passkey_hash <> extensions.crypt(p_passkey, r.passkey_hash) then
    perform pg_sleep(0.5);
    return;
  end if;
  insert into public.chat_members (room_id, user_id) values (r.id, auth.uid()) on conflict do nothing;
  return query select r.id, r.name, r.kind;
end $$;

revoke all on function public.create_chat_room(text, boolean, text) from public, anon;
revoke all on function public.join_private_room(text, text) from public, anon;
grant execute on function public.create_chat_room(text, boolean, text) to authenticated;
grant execute on function public.join_private_room(text, text) to authenticated;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_reactions;

insert into public.chat_rooms (name, kind) values ('gn', 'global'), ('gn2', 'global');

-- ---------- Movies profiles ----------
create table public.pickl_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 24),
  color text not null default '#e50914',
  created_at timestamptz not null default now()
);
create index pickl_profiles_user on public.pickl_profiles (user_id);

create table public.pickl_list (
  profile_id uuid not null references public.pickl_profiles (id) on delete cascade,
  media_id text not null,
  title text not null,
  poster text,
  backdrop text,
  added_at timestamptz not null default now(),
  primary key (profile_id, media_id)
);

create table public.pickl_progress (
  profile_id uuid not null references public.pickl_profiles (id) on delete cascade,
  media_id text not null,
  title text not null,
  poster text,
  time_sec real not null default 0,
  duration_sec real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, media_id)
);

grant select, insert, update, delete on public.pickl_profiles to authenticated;
grant all on public.pickl_profiles to service_role;
grant select, insert, update, delete on public.pickl_list to authenticated;
grant all on public.pickl_list to service_role;
grant select, insert, update, delete on public.pickl_progress to authenticated;
grant all on public.pickl_progress to service_role;

create or replace function public.owns_pickl_profile(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pickl_profiles where id = pid and user_id = auth.uid());
$$;

alter table public.pickl_profiles enable row level security;
alter table public.pickl_list enable row level security;
alter table public.pickl_progress enable row level security;

create policy "profiles own" on public.pickl_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "list own profile" on public.pickl_list
  for all to authenticated using (public.owns_pickl_profile(profile_id)) with check (public.owns_pickl_profile(profile_id));
create policy "progress own profile" on public.pickl_progress
  for all to authenticated using (public.owns_pickl_profile(profile_id)) with check (public.owns_pickl_profile(profile_id));