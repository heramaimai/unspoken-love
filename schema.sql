create extension if not exists vector;
create extension if not exists pgcrypto;

do $$ begin
  create type segment_label as enum (
    'therapist_speech',
    'client_speech',
    'relationship_event',
    'case_memory',
    'style_sample'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists app_users (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references app_users(id) on delete cascade,
  title text not null,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists transcript_segments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references app_users(id) on delete cascade,
  transcript_id uuid references transcripts(id) on delete cascade,
  label segment_label not null,
  speaker text,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists therapist_profiles (
  user_id text primary key references app_users(id) on delete cascade,
  display_name text not null default '麦子的咨询师',
  transcript_count int not null default 0,
  segment_count int not null default 0,
  therapist_turn_count int not null default 0,
  style_summary text not null default '',
  language_markers jsonb not null default '{}'::jsonb,
  thinking_patterns jsonb not null default '{}'::jsonb,
  response_guidelines text[] not null default '{}',
  sample_quotes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists transcript_segments_user_label_idx
  on transcript_segments(user_id, label);

create index if not exists transcript_segments_embedding_idx
  on transcript_segments using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references app_users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id text not null references app_users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references app_users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  source_message_id uuid references conversation_messages(id) on delete set null,
  label segment_label not null default 'case_memory',
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_label_idx
  on memories(user_id, label);

create index if not exists memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_transcript_segments(
  query_embedding vector(1536),
  match_user_id text,
  match_count int default 8
)
returns table (
  id uuid,
  label segment_label,
  speaker text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
begin atomic
  select
    transcript_segments.id,
    transcript_segments.label,
    transcript_segments.speaker,
    transcript_segments.content,
    transcript_segments.metadata,
    1 - (embedding <=> query_embedding) as similarity
  from transcript_segments
  where user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
end;

create or replace function match_memories(
  query_embedding vector(1536),
  match_user_id text,
  match_count int default 6
)
returns table (
  id uuid,
  label segment_label,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
begin atomic
  select
    memories.id,
    memories.label,
    memories.content,
    memories.metadata,
    1 - (embedding <=> query_embedding) as similarity
  from memories
  where user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
end;
