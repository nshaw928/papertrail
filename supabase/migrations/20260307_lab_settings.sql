-- Add role_permissions JSONB column to labs for granular permission control
alter table labs add column role_permissions jsonb not null default '{
  "admin": {
    "create_collection": true,
    "post_announcement": true,
    "schedule_journal_club": true,
    "upload_files": true,
    "create_lab_notes": true
  },
  "member": {
    "create_collection": false,
    "post_announcement": true,
    "schedule_journal_club": false,
    "upload_files": true,
    "create_lab_notes": true
  }
}'::jsonb;

-- Validate permission structure
alter table labs add constraint valid_role_permissions check (
  role_permissions ? 'admin' and role_permissions ? 'member'
  and jsonb_typeof(role_permissions->'admin') = 'object'
  and jsonb_typeof(role_permissions->'member') = 'object'
);

-- Lab inquiries: contact form submissions for lab plan
-- Only accessed via service_role (insert from API, read from admin dashboard)
create table lab_inquiries (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 320),
  institution text check (char_length(institution) <= 300),
  lab_size text check (lab_size in ('2-10', '10-25', '25-50', '50+')),
  message text check (char_length(message) <= 5000),
  created_at timestamptz default now()
);

-- RLS enabled with no policies — only service_role can access
alter table lab_inquiries enable row level security;
