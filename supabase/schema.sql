-- Buen Café, Gran Café — esquema inicial de Supabase
-- Ejecutar en el SQL editor del proyecto de Supabase.

create table if not exists public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  coins double precision not null default 0,
  click_power double precision not null default 1,
  passive_income double precision not null default 0,
  upgrades jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.upgrades (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null check (category in ('click', 'passive')),
  effect_value double precision not null,
  base_cost double precision not null,
  cost_growth double precision not null default 1.15,
  tier int not null default 1
);

alter table public.players enable row level security;
alter table public.upgrades enable row level security;

-- El backend usa la service role key y no pasa por RLS, pero dejamos
-- políticas correctas por si el frontend llega a leer directo con la anon key.
drop policy if exists "players select own" on public.players;
create policy "players select own" on public.players
  for select using (auth.uid() = id);

drop policy if exists "players update own" on public.players;
create policy "players update own" on public.players
  for update using (auth.uid() = id);

drop policy if exists "players insert own" on public.players;
create policy "players insert own" on public.players
  for insert with check (auth.uid() = id);

drop policy if exists "upgrades public read" on public.upgrades;
create policy "upgrades public read" on public.upgrades
  for select using (true);

-- Catálogo inicial de mejoras del MVP.
insert into public.upgrades (id, name, description, category, effect_value, base_cost, cost_growth, tier)
values
  ('molino', 'Molino mejorado', '+1 de fuerza de clic por nivel', 'click', 1, 15, 1.15, 1),
  ('leche_espuma', 'Leche espumada premium', '+5 de fuerza de clic por nivel', 'click', 5, 100, 1.15, 2),
  ('prensa_frances', 'Prensa francesa', '+20 de fuerza de clic por nivel', 'click', 20, 800, 1.15, 3),
  ('ayudante', 'Ayudante barista', '+1 moneda/seg por nivel', 'passive', 1, 50, 1.15, 1),
  ('maquina_auto', 'Máquina espresso automática', '+5 monedas/seg por nivel', 'passive', 5, 300, 1.15, 2),
  ('sucursal', 'Nueva sucursal', '+25 monedas/seg por nivel', 'passive', 25, 1500, 1.15, 3)
on conflict (id) do nothing;
