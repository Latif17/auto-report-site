-- schema_update_stale_sweep_rpc.sql
-- Gives up on unpooled (pool_data = false) users whose report has been stuck
-- 'pending' longer than p_cutoff_hours (e.g. the GOV.UK form changed and broke
-- the scraper). Marks those reports 'failed' and purges the now-abandoned PII,
-- all in one atomic statement, mirroring cleanup_unpooled_users' delete+scrub logic.
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON opted_in_user_reports(created_at);

CREATE OR REPLACE FUNCTION sweep_stale_unpooled_reports(p_cutoff_hours integer)
RETURNS TABLE(purged_email text) AS $$
    WITH stale AS (
        UPDATE opted_in_user_reports r
        SET status = 'failed'
        FROM users u
        WHERE r.user_email = u.email
          AND u.pool_data = false
          AND r.status = 'pending'
          AND r.created_at < NOW() - (p_cutoff_hours || ' hours')::interval
        RETURNING r.user_email
    ),
    deleted AS (
        DELETE FROM users
        WHERE email IN (SELECT DISTINCT user_email FROM stale)
          AND pool_data = false
          AND NOT EXISTS (
            SELECT 1
            FROM opted_in_user_reports r2
            JOIN incidents i ON i.id = r2.incident_id
            WHERE r2.user_email = users.email
              AND r2.status = 'pending'
              AND i.status IN ('pending', 'processing')
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
