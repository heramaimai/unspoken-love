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
