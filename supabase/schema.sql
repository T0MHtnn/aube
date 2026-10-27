-- Aube : schéma de la base
-- À exécuter une seule fois dans le SQL Editor du projet Supabase d'Aube.

-- Les cartes du tableau de bord
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null,
  size text not null check (size in ('small', 'wide', 'large')),
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cards_user_position_idx on public.cards (user_id, position);

alter table public.cards enable row level security;

create policy "Users manage their own cards"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- La carte Notes (une seule par personne, toujours présente)
create table if not exists public.notes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Users manage their own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
