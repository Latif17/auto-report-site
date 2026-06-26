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

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  time_of_smell TEXT,
  smell_type TEXT,
  business_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
