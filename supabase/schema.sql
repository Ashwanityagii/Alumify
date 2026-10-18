-- Alumify schema for Supabase. Run in: Supabase Dashboard -> SQL Editor.
-- The Node API uses the service-role key (bypasses RLS). RLS is enabled with NO public policies,
-- so the anon/authenticated keys in a browser can never read or write these tables directly.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null check (role in ('student','alumni','faculty','admin')),
  status      text not null default 'pending' check (status in ('active','pending','disabled')),
  branch      text,
  year        text,
  grad_year   int,
  headline    text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.requests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  branch        text not null,
  year          text not null,
  type          text not null check (type in ('coffee','resume','guidance','batch')),
  topic         text not null,
  details       text,
  audience      text not null check (audience in ('alumni','faculty')),
  target_id     uuid references public.profiles(id) on delete set null,
  batch_status  text check (batch_status in ('upcoming','running')),
  status        text not null default 'pending'
                check (status in ('pending','accepted','scheduled','completed','declined','cancelled')),
  mentor_id     uuid references public.profiles(id) on delete set null,
  rejected_by   uuid[] not null default '{}',
  scheduled_at  timestamptz,
  accepted_at   timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists requests_student_idx  on public.requests(student_id);
create index if not exists requests_mentor_idx   on public.requests(mentor_id);
create index if not exists requests_queue_idx    on public.requests(audience, status);

-- Atomic append so two concurrent rejections never overwrite each other.
create or replace function public.add_rejection(p_request uuid, p_mentor uuid)
returns void language sql security definer set search_path = public as $$
  update public.requests
     set rejected_by = array_append(rejected_by, p_mentor)
   where id = p_request and not (p_mentor = any(rejected_by));
$$;
revoke all on function public.add_rejection(uuid, uuid) from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
-- (intentionally no policies: only the server's service-role key may access the data)

-- After you register the first account through the app, promote it to admin:
--   update public.profiles set role = 'admin', status = 'active' where email = 'you@example.com';
-- Or create the admin directly: create the user under Authentication -> Users, then insert a profiles row.
