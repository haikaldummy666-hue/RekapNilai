create extension if not exists pgcrypto;

create table if not exists public.madrasah_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'madrasah')) default 'madrasah',
  status text not null check (status in ('pending', 'active', 'disabled')) default 'pending',
  nama_madrasah text not null default '',
  alamat text not null default '',
  kontak text not null default '',
  logo_url text,
  kepala_madrasah text,
  kelas_format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.madrasah_profiles;
create trigger trg_profiles_updated_at
before update on public.madrasah_profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.madrasah_profiles p
    where p.id = uid and p.role = 'admin' and p.status = 'active'
  );
$$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  madrasah_id uuid not null references public.madrasah_profiles(id) on delete cascade,
  identitas jsonb not null default '{}'::jsonb,
  nilai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  madrasah_id uuid,
  actor_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb
);

alter table public.madrasah_profiles enable row level security;
alter table public.students enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.madrasah_profiles;
create policy "profiles_select_self_or_admin"
on public.madrasah_profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_self" on public.madrasah_profiles;
create policy "profiles_update_self"
on public.madrasah_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_admin_update_any" on public.madrasah_profiles;
create policy "profiles_admin_update_any"
on public.madrasah_profiles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "students_crud_owner_or_admin" on public.students;
create policy "students_crud_owner_or_admin"
on public.students
for all
to authenticated
using (madrasah_id = auth.uid() or public.is_admin(auth.uid()))
with check (madrasah_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "audit_insert_self_or_admin" on public.audit_logs;
create policy "audit_insert_self_or_admin"
on public.audit_logs
for insert
to authenticated
with check (madrasah_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin"
on public.audit_logs
for select
to authenticated
using (public.is_admin(auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.madrasah_profiles (id, role, status, nama_madrasah)
  values (new.id, 'madrasah', 'pending', coalesce(new.raw_user_meta_data->>'nama_madrasah', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

