-- schema_update.sql
ALTER TABLE incidents ADD COLUMN date_of_smell DATE;
-- Note: time_of_smell is already TEXT, we will just use it as is, or nullable. We'll leave it as TEXT NOT NULL and just auto-fill if empty.
