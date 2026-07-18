-- schema_update_cleanup_rpc.sql
-- Atomic cleanup for unpooled (pool_data = false) users: deletes their PII from
-- `users` once they have no other active (pending/processing) reports, and scrubs
-- their email out of historical opted_in_user_reports rows. Runs as a single
-- statement so the "any other pending work?" check and the delete/scrub can't
-- race with a concurrent report insert for the same email.
CREATE OR REPLACE FUNCTION cleanup_unpooled_users(p_emails text[], p_exclude_incident_id integer DEFAULT NULL)
RETURNS TABLE(deleted_email text) AS $$
    WITH deleted AS (
        DELETE FROM users
        WHERE email = ANY(p_emails)
          AND pool_data = false
          AND NOT EXISTS (
            SELECT 1
            FROM opted_in_user_reports r
            JOIN incidents i ON i.id = r.incident_id
            WHERE r.user_email = users.email
              AND r.status = 'pending'
              AND i.status IN ('pending', 'processing')
              AND (p_exclude_incident_id IS NULL OR r.incident_id <> p_exclude_incident_id)
          )
        RETURNING email
    ),
    scrubbed AS (
        UPDATE opted_in_user_reports
        SET user_email = NULL
        WHERE user_email IN (SELECT email FROM deleted)
        RETURNING 1
    )
    SELECT email FROM deleted;
$$ LANGUAGE sql;
