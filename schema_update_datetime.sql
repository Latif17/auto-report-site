ALTER TABLE incidents 
ADD COLUMN smell_timestamp TIMESTAMP;

-- If there's existing data, you'd populate it like this:
-- UPDATE incidents SET smell_timestamp = TO_TIMESTAMP(date_of_smell::text || ' ' || time_of_smell, 'YYYY-MM-DD HH24:MI');

ALTER TABLE incidents 
ALTER COLUMN smell_timestamp SET NOT NULL;

ALTER TABLE incidents 
DROP COLUMN date_of_smell,
DROP COLUMN time_of_smell;
