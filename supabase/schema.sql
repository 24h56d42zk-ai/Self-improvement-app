-- Voer dit één keer uit in Supabase → SQL Editor.
-- Eén rij per gebruiker met de volledige database als JSON.

create table if not exists public.dashboard_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_state enable row level security;

-- Iedereen ziet en bewerkt uitsluitend zijn eigen rij.
drop policy if exists "eigen rij lezen"     on public.dashboard_state;
drop policy if exists "eigen rij aanmaken"  on public.dashboard_state;
drop policy if exists "eigen rij bijwerken" on public.dashboard_state;

create policy "eigen rij lezen"
  on public.dashboard_state for select
  using (auth.uid() = user_id);

create policy "eigen rij aanmaken"
  on public.dashboard_state for insert
  with check (auth.uid() = user_id);

create policy "eigen rij bijwerken"
  on public.dashboard_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
