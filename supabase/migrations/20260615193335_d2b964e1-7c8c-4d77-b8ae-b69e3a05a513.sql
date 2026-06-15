
-- Admin role infrastructure
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Ad submissions (raw user input awaiting approval)
create table public.ad_submissions (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  website_url text,
  industry text not null,
  tagline text,
  ad_type text not null check (ad_type in ('image_5','slider_10')),
  image_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  created_at timestamptz not null default now()
);
grant select, insert on public.ad_submissions to anon;
grant select, insert, update, delete on public.ad_submissions to authenticated;
grant all on public.ad_submissions to service_role;
alter table public.ad_submissions enable row level security;

create policy "Anyone can submit an ad"
  on public.ad_submissions for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Admins view all submissions"
  on public.ad_submissions for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update submissions"
  on public.ad_submissions for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete submissions"
  on public.ad_submissions for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Approved live ads
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.ad_submissions(id) on delete set null,
  business_name text not null,
  website_url text,
  tagline text,
  industry text not null,
  ad_type text not null,
  image_url text not null,
  duration_seconds integer not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','removed')),
  created_at timestamptz not null default now()
);
grant select on public.ads to anon, authenticated;
grant insert, update, delete on public.ads to authenticated;
grant all on public.ads to service_role;
alter table public.ads enable row level security;

create policy "Public reads active live ads"
  on public.ads for select
  to anon, authenticated
  using (status = 'active' and expires_at > now());

create policy "Admins view all ads"
  on public.ads for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins insert ads"
  on public.ads for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins update ads"
  on public.ads for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete ads"
  on public.ads for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
