create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  source_pdf_path text not null,
  completed_pdf_path text,
  sender_name text not null,
  sender_email text not null,
  recipient_name text,
  recipient_email text,
  email_subject text,
  email_message text,
  signing_token text unique,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Completed', 'Expired')),
  fields jsonb not null default '[]'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();
