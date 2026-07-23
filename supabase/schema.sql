CREATE TABLE users (
  email text PRIMARY KEY,
  full_name text,
  postcode text,
  phone text,
  address text,
  pool_data boolean DEFAULT false
);


CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    smell_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    smell_type TEXT NOT NULL,
    business_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reported_by TEXT REFERENCES users(email) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  status TEXT DEFAULT 'pending',
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE opted_in_user_reports ENABLE ROW LEVEL SECURITY;

-- schema_indexes.sql
-- Run this in your Supabase SQL Editor to apply performance optimizations

-- 1. Indexes for the `incidents` table
-- Speeds up the scraper querying for pending incidents
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- Speeds up the API checking if an incident already exists at a given time and location
CREATE INDEX IF NOT EXISTS idx_incidents_smell_timestamp ON incidents(smell_timestamp);
CREATE INDEX IF NOT EXISTS idx_incidents_business_location ON incidents(business_location);

-- 2. Indexes for the `opted_in_user_reports` table
-- Speeds up queries that check which incidents a user has opted into
CREATE INDEX IF NOT EXISTS idx_user_reports_email ON opted_in_user_reports(user_email);

-- Speeds up queries that fetch all users who opted into a specific incident (used by scraper)
CREATE INDEX IF NOT EXISTS idx_user_reports_incident ON opted_in_user_reports(incident_id);

-- 3. Unique Constraint
-- Prevents duplicate records if a user clicks submit twice or concurrent requests happen,
-- which also makes the `error.code !== '23505'` check in server.js work correctly.
-- Note: If you already have duplicate rows in this table, this command might fail. 
-- If it fails, you will need to delete the duplicate rows first.
ALTER TABLE opted_in_user_reports ADD CONSTRAINT unique_user_incident UNIQUE (user_email, incident_id);