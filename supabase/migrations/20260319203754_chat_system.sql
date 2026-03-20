-- Create chat channels table
create table public.channels (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('direct', 'team', 'project')),
    organization_id uuid references public.organizations(id) on delete cascade,
    project_id uuid references public.projects(id) on delete cascade,
    name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create channel members table
create table public.channel_members (
    channel_id uuid references public.channels(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role text default 'member' check (role in ('admin', 'member')),
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_read_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (channel_id, user_id)
);

-- Create messages table
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    channel_id uuid references public.channels(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text,
    type text default 'text' check (type in ('text', 'file')),
    file_url text,
    reply_to_id uuid references public.messages(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    deleted_at timestamp with time zone
);

-- Create message reactions table
create table public.message_reactions (
    id uuid default gen_random_uuid() primary key,
    message_id uuid references public.messages(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    emoji text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(message_id, user_id, emoji)
);

-- Enable Row Level Security
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

-- Channels Policies
create policy "Users can view channels they are members of" on public.channels
    for select using (
        exists (
            select 1 from public.channel_members
            where channel_members.channel_id = channels.id
            and channel_members.user_id = auth.uid()
        )
    );

create policy "Org members can view team channels" on public.channels
    for select using (
        type = 'team' and exists (
            select 1 from public.organization_members
            where organization_members.organization_id = channels.organization_id
            and organization_members.user_id = auth.uid()
        )
    );

create policy "Users can create direct or project channels" on public.channels
    for insert with check (auth.uid() is not null);

create policy "Org admins can manage channels" on public.channels
    for all using (
        exists (
            select 1 from public.organization_members
            where organization_members.organization_id = channels.organization_id
            and organization_members.user_id = auth.uid()
            and organization_members.role = 'admin'
        )
    );

-- Channel Members Policies
create policy "Users can view members of their channels" on public.channel_members
    for select using (
        exists (
            select 1 from public.channel_members cm
            where cm.channel_id = channel_members.channel_id
            and cm.user_id = auth.uid()
        )
    );

create policy "Users can insert themselves into channels" on public.channel_members
    for insert with check (
        user_id = auth.uid()
    );

create policy "Users can update their own last_read_at" on public.channel_members
    for update using (
        user_id = auth.uid()
    );

-- Messages Policies
create policy "Users can view messages in their channels" on public.messages
    for select using (
        exists (
            select 1 from public.channel_members
            where channel_members.channel_id = messages.channel_id
            and channel_members.user_id = auth.uid()
        )
    );

create policy "Users can insert messages in their channels" on public.messages
    for insert with check (
        auth.uid() = user_id and
        exists (
            select 1 from public.channel_members
            where channel_members.channel_id = messages.channel_id
            and channel_members.user_id = auth.uid()
        )
    );

create policy "Users can update their own messages" on public.messages
    for update using (
        auth.uid() = user_id
    );

create policy "Users can delete their own messages" on public.messages
    for delete using (
        auth.uid() = user_id
    );

-- Message Reactions Policies
create policy "Users can view reactions in their channels" on public.message_reactions
    for select using (
        exists (
            select 1 from public.messages m
            join public.channel_members cm on cm.channel_id = m.channel_id
            where m.id = message_reactions.message_id
            and cm.user_id = auth.uid()
        )
    );

create policy "Users can add reactions" on public.message_reactions
    for insert with check (auth.uid() = user_id);

create policy "Users can delete their own reactions" on public.message_reactions
    for delete using (auth.uid() = user_id);

-- Storage bucket for chat attachments
insert into storage.buckets (id, name, public) 
values ('chat_attachments', 'chat_attachments', true)
on conflict (id) do nothing;

-- Storage policies for chat attachments
create policy "Chat attachments are publicly accessible"
    on storage.objects for select
    using ( bucket_id = 'chat_attachments' );

create policy "Authenticated users can upload chat attachments"
    on storage.objects for insert
    with check ( bucket_id = 'chat_attachments' and auth.role() = 'authenticated' );

create policy "Users can modify their own chat attachments"
    on storage.objects for update
    using ( bucket_id = 'chat_attachments' and auth.uid() = owner );

create policy "Users can delete their own chat attachments"
    on storage.objects for delete
    using ( bucket_id = 'chat_attachments' and auth.uid() = owner );

-- Realtime Configuration
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['messages', 'channel_members', 'message_reactions', 'channels']) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
