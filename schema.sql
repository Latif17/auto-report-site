CREATE TABLE users (
  email text PRIMARY KEY,
  full_name text,
  postcode text,
  phone text,
  address text
);
CREATE TABLE system_stats (
  id integer PRIMARY KEY,
  last_report_time timestamp with time zone
);
INSERT INTO system_stats (id) VALUES (1);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    date_of_smell DATE,
    time_of_smell TEXT NOT NULL,
    smell_type TEXT NOT NULL,
    business_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
