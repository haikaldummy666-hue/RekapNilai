-- Migration: tambah kolom email ke madrasah_profiles
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom email
alter table public.madrasah_profiles
  add column if not exists email text not null default '';

-- 2. Update trigger agar menyimpan email saat user baru mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.madrasah_profiles (id, role, status, nama_madrasah, email)
  values (
    new.id,
    'madrasah',
    'pending',
    coalesce(new.raw_user_meta_data->>'nama_madrasah', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.madrasah_profiles.email);
  return new;
end;
$$;

-- 3. Pastikan admin bisa baca semua profil (update RLS)
drop policy if exists "profiles_select_self_or_admin" on public.madrasah_profiles;
create policy "profiles_select_self_or_admin"
on public.madrasah_profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

-- 4. Izinkan admin update semua status (termasuk approve/disable)
drop policy if exists "profiles_admin_update_any" on public.madrasah_profiles;
create policy "profiles_admin_update_any"
on public.madrasah_profiles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 5. Izinkan user baru insert profile sendiri (untuk signUp flow)
drop policy if exists "profiles_insert_self" on public.madrasah_profiles;
create policy "profiles_insert_self"
on public.madrasah_profiles
for insert
to authenticated
with check (id = auth.uid());
