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
