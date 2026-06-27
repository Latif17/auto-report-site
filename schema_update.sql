-- schema_update.sql
ALTER TABLE incidents ADD COLUMN date_of_smell DATE;
-- Note: time_of_smell is already TEXT, we will just use it as is, or nullable. We'll leave it as TEXT NOT NULL and just auto-fill if empty.

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE opted_in_user_reports ENABLE ROW LEVEL SECURITY;

