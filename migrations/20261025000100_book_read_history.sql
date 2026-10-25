-- Add private reread dates to the existing owner-protected book row.
-- Existing clients omit this field and preserve its default/current value.
alter table public.books
  add column if not exists read_history jsonb not null default '[]'::jsonb
  check (jsonb_typeof(read_history) = 'array');
