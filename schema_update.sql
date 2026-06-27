-- schema_update.sql
ALTER TABLE incidents ADD COLUMN date_of_smell DATE;
-- Note: time_of_smell is already TEXT, we will just use it as is, or nullable. We'll leave it as TEXT NOT NULL and just auto-fill if empty.

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE opted_in_user_reports ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write access (server acts as trusted client)
CREATE POLICY "Allow anon select on users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on users" ON users FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon select on system_stats" ON system_stats FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update on system_stats" ON system_stats FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon select on incidents" ON incidents FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on incidents" ON incidents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on incidents" ON incidents FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon select on opted_in_user_reports" ON opted_in_user_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on opted_in_user_reports" ON opted_in_user_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on opted_in_user_reports" ON opted_in_user_reports FOR UPDATE TO anon USING (true);
