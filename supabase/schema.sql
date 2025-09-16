create extension if not exists pgcrypto with schema extensions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='visibility' AND typnamespace='public'::regnamespace) THEN
    CREATE TYPE public.visibility AS ENUM ('public','org','private','market');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='audience' AND typnamespace='public'::regnamespace) THEN
    CREATE TYPE public.audience AS ENUM ('teachers','students','both');
  END IF;
END $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  display_name text,
  role text check (role in ('platform_admin','org_admin','teacher','student')) default 'teacher',
  org_id uuid references public.organizations(id),
  created_at timestamptz default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id),
  org_id uuid references public.organizations(id),
  title text not null,
  objective text,
  materials jsonb default '[]'::jsonb,
  materials_media jsonb default '[]'::jsonb,
  est_minutes int,
  tags text[],
  visibility public.visibility default 'org',
  audience public.audience default 'both',
  grades text[] default '{}',
  subjects text[] default '{}',
  price_mxn numeric(10,2),
  listing_status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete cascade,
  "order" int not null default 0,
  name text not null,
  text text,
  media jsonb default '[]'::jsonb,
  allow_uploads boolean default true,
  upload_kinds text[] default '{image,video}',
  max_uploads int default 2
);

create or replace function public.current_org_id()
returns uuid language sql stable as $$
  select org_id from public.profiles where id = auth.uid();
$$;

alter table public.activities enable row level security;
alter table public.sections   enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities public read') THEN
    CREATE POLICY "activities public read" ON public.activities FOR SELECT USING (visibility = 'public');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities org read') THEN
    CREATE POLICY "activities org read" ON public.activities FOR SELECT USING (visibility = 'org' AND org_id = public.current_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities owner write') THEN
    CREATE POLICY "activities owner write" ON public.activities FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sections' AND policyname='sections public read') THEN
    CREATE POLICY "sections public read" ON public.sections FOR SELECT USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = sections.activity_id AND a.visibility = 'public'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sections' AND policyname='sections org read') THEN
    CREATE POLICY "sections org read" ON public.sections FOR SELECT USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = sections.activity_id AND a.visibility = 'org' AND a.org_id = public.current_org_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sections' AND policyname='sections owner write') THEN
    CREATE POLICY "sections owner write" ON public.sections FOR ALL USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = sections.activity_id AND a.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = sections.activity_id AND a.owner_id = auth.uid()));
  END IF;
END $$;
