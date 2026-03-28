alter table public.projects
add column if not exists is_archived boolean not null default false,
add column if not exists archived_at timestamp with time zone null;

create index if not exists idx_projects_user_archived
on public.projects (user_id, is_archived);
