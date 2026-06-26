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
