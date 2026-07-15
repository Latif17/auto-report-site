-- schema_update.sql
ALTER TABLE incidents ADD COLUMN date_of_smell DATE;
-- Note: time_of_smell is already TEXT, we will just use it as is, or nullable. We'll leave it as TEXT NOT NULL and just auto-fill if empty.

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE opted_in_user_reports ENABLE ROW LEVEL SECURITY;

-- Drop insecure anon policies that were previously removed from schema.sql
DROP POLICY IF EXISTS "Allow anon select on users" ON users;
DROP POLICY IF EXISTS "Allow anon insert on users" ON users;
DROP POLICY IF EXISTS "Allow anon update on users" ON users;



DROP POLICY IF EXISTS "Allow anon select on incidents" ON incidents;
DROP POLICY IF EXISTS "Allow anon insert on incidents" ON incidents;
DROP POLICY IF EXISTS "Allow anon update on incidents" ON incidents;

DROP POLICY IF EXISTS "Allow anon select on opted_in_user_reports" ON opted_in_user_reports;
DROP POLICY IF EXISTS "Allow anon insert on opted_in_user_reports" ON opted_in_user_reports;
DROP POLICY IF EXISTS "Allow anon update on opted_in_user_reports" ON opted_in_user_reports;

-- merge smell timestamp
ALTER TABLE incidents 
ADD COLUMN smell_timestamp TIMESTAMP;

ALTER TABLE incidents 
ALTER COLUMN smell_timestamp SET NOT NULL;

ALTER TABLE incidents 
DROP COLUMN date_of_smell,
DROP COLUMN time_of_smell;

-- add status to opted_in_user_reports
ALTER TABLE opted_in_user_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON opted_in_user_reports(status);

ALTER TABLE opted_in_user_reports ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
