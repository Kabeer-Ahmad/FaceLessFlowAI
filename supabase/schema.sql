-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users & Credits)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  credits integer default 10 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);

-- PROJECTS
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  script text,
  status text check (status in ('draft', 'generating', 'done')) default 'draft',
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Projects
alter table projects enable row level security;
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);

-- SCENES
create table scenes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects on delete cascade not null,
  order_index integer not null,
  text text not null,
  prompt text,
  image_url text,
  audio_url text,
  duration float,
  status text check (status in ('pending', 'ready', 'error')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Scenes
alter table scenes enable row level security;
create policy "Users can view scenes of own projects" on scenes for select using (
  exists ( select 1 from projects where id = scenes.project_id and user_id = auth.uid() )
);
create policy "Users can insert scenes to own projects" on scenes for insert with check (
  exists ( select 1 from projects where id = scenes.project_id and user_id = auth.uid() )
);
create policy "Users can update scenes of own projects" on scenes for update using (
  exists ( select 1 from projects where id = scenes.project_id and user_id = auth.uid() )
);

-- RPC: Decrement Credits
create or replace function decrement_credits(user_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set credits = credits - amount
  where id = user_id;
end;
$$;

-- USER CREATION TRIGGER (Fix for missing profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, credits)
  values (new.id, 10);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STORAGE BUCKET POLICY (Execute in Storage Dashboard or SQL if supported)
-- insert into storage.buckets (id, name, public) values ('assets', 'assets', true);
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'assets' );
-- create policy "Auth Upload" on storage.objects for insert with check ( bucket_id = 'assets' and auth.role() = 'authenticated' );
