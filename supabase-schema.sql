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
  nilai_history jsonb not null default '{"entries":[]}'::jsonb,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.students
  add column if not exists nilai_history jsonb not null default '{"entries":[]}'::jsonb;
alter table public.students
  add column if not exists deleted_at timestamptz;
alter table public.students
  add column if not exists nisn text generated always as (nullif(btrim(identitas->>'nisn'),'')) stored;
alter table public.students
  add column if not exists no_ujian text generated always as (nullif(btrim(identitas->>'noUjian'),'')) stored;

create unique index if not exists students_unique_nisn_per_madrasah
on public.students (madrasah_id, nisn)
where nisn is not null and deleted_at is null;

create unique index if not exists students_unique_no_ujian_per_madrasah
on public.students (madrasah_id, no_ujian)
where no_ujian is not null and deleted_at is null;

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create or replace function public.sync_students_snapshot(p_students jsonb)
returns table (inserted int, updated int, soft_deleted int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_inserted int := 0;
  v_updated int := 0;
  v_deleted int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

  create temp table if not exists tmp_students (
    id uuid not null,
    identitas jsonb not null,
    nilai jsonb not null,
    nilai_history jsonb not null,
    updated_at timestamptz not null
  ) on commit drop;

  truncate table tmp_students;

  insert into tmp_students (id, identitas, nilai, nilai_history, updated_at)
  select
    (e->>'id')::uuid as id,
    coalesce(e->'identitas', '{}'::jsonb) as identitas,
    coalesce(e->'nilai', '{}'::jsonb) as nilai,
    coalesce(e->'nilaiHistory', '{"entries":[]}'::jsonb) as nilai_history,
    coalesce(nullif(e->>'updatedAt','')::timestamptz, now()) as updated_at
  from jsonb_array_elements(coalesce(p_students, '[]'::jsonb)) as e
  where (e->>'id') is not null and (e->>'id') <> '';

  with dedup as (
    select distinct on (id)
      id, identitas, nilai, nilai_history, updated_at
    from tmp_students
    order by id, updated_at desc
  ),
  upserted as (
    insert into public.students (id, madrasah_id, identitas, nilai, nilai_history, deleted_at, updated_at)
    select id, uid, identitas, nilai, nilai_history, null, updated_at
    from dedup
    on conflict (id)
    do update set
      identitas = excluded.identitas,
      nilai = excluded.nilai,
      nilai_history = excluded.nilai_history,
      deleted_at = null,
      updated_at = excluded.updated_at
    where public.students.madrasah_id = uid
      and excluded.updated_at >= public.students.updated_at
    returning xmax = 0 as inserted_flag
  )
  select
    count(*) filter (where inserted_flag) as inserted,
    count(*) filter (where not inserted_flag) as updated
  into v_inserted, v_updated
  from upserted;

  update public.students s
  set deleted_at = now()
  where s.madrasah_id = uid
    and s.deleted_at is null
    and not exists (
      select 1
      from tmp_students t
      where t.id = s.id
    );
  get diagnostics v_deleted = row_count;

  inserted := v_inserted;
  updated := v_updated;
  soft_deleted := v_deleted;
  return;
end;
$$;

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

create table if not exists public.user_app_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null default 'default',
  state jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

drop trigger if exists trg_user_app_state_updated_at on public.user_app_state;
create trigger trg_user_app_state_updated_at
before update on public.user_app_state
for each row execute function public.set_updated_at();

alter table public.user_app_state enable row level security;

drop policy if exists "user_app_state_crud_self" on public.user_app_state;
create policy "user_app_state_crud_self"
on public.user_app_state
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.upsert_user_app_state(p_key text, p_state jsonb)
returns table (id uuid, user_id uuid, key text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_app_state (user_id, key, state, deleted_at)
  values (auth.uid(), coalesce(p_key, 'default'), coalesce(p_state, '{}'::jsonb), null)
  on conflict (user_id, key)
  do update set state = excluded.state, deleted_at = null;

  return query
  select s.id, s.user_id, s.key, s.updated_at
  from public.user_app_state s
  where s.user_id = auth.uid() and s.key = coalesce(p_key, 'default');
end;
$$;

create or replace function public.soft_delete_user_app_state(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_app_state
  set deleted_at = now()
  where user_id = auth.uid() and key = coalesce(p_key, 'default');
end;
$$;
