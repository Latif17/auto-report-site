-- schema_update_pool_data.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pool_data boolean DEFAULT false;
