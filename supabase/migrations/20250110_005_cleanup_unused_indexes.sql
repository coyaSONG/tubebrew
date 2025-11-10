-- ============================================
-- Migration: Phase 5 - Cleanup Unused Indexes
-- Description: Remove unused indexes to reclaim storage and reduce maintenance overhead
-- Risk Level: LOW
-- Estimated Time: 2 minutes
-- Rollback: Easy
-- ============================================

-- IMPORTANT: THIS MIGRATION IS OPTIONAL
-- Only proceed if you're certain these indexes are truly unused
-- Monitor production traffic before removing to confirm they're not needed

-- Issue: 3 indexes have never been used and consume storage
-- Solution: Drop unused indexes using CONCURRENTLY to avoid locks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

-- ============================================
-- ANALYSIS OF UNUSED INDEXES
-- ============================================

/*
Index: idx_websub_expiring
Table: channel_websub_subscriptions
Purpose: Query subscriptions that are about to expire
Usage: 0 scans recorded
Recommendation: Drop (can recreate if websub renewal logic is added later)

Index: idx_websub_failed
Table: channel_websub_subscriptions
Purpose: Query failed subscription attempts
Usage: 0 scans recorded
Recommendation: Drop (can recreate if failure analysis is needed later)

Index: idx_users_provider_token_expires
Table: users
Purpose: Query users whose OAuth tokens are expiring
Usage: 0 scans recorded
Recommendation: Drop (can recreate if token refresh logic is added later)
*/

-- ============================================
-- BACKUP INDEX DEFINITIONS
-- ============================================

-- Store current index definitions for easy recreation if needed
/*
CREATE INDEX idx_websub_expiring
  ON public.channel_websub_subscriptions(hub_lease_expires_at)
  WHERE status = 'verified';

CREATE INDEX idx_websub_failed
  ON public.channel_websub_subscriptions(last_subscribe_attempt_at)
  WHERE status = 'failed';

CREATE INDEX idx_users_provider_token_expires
  ON public.users(provider_token_expires_at)
  WHERE provider_token IS NOT NULL;
*/

-- ============================================
-- CHECK INDEX USAGE BEFORE DROPPING
-- ============================================

-- Display current index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_websub_expiring',
  'idx_websub_failed',
  'idx_users_provider_token_expires'
)
ORDER BY tablename, indexname;

-- ============================================
-- DROP UNUSED INDEXES
-- ============================================

-- Drop idx_websub_expiring
-- This index was for finding subscriptions approaching expiration
DROP INDEX CONCURRENTLY IF EXISTS public.idx_websub_expiring;

-- Drop idx_websub_failed
-- This index was for analyzing failed subscription attempts
DROP INDEX CONCURRENTLY IF EXISTS public.idx_websub_failed;

-- Drop idx_users_provider_token_expires
-- This index was for finding users with expiring OAuth tokens
DROP INDEX CONCURRENTLY IF EXISTS public.idx_users_provider_token_expires;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify indexes were dropped successfully
DO $$
DECLARE
  remaining_indexes text[];
BEGIN
  SELECT array_agg(indexname)
  INTO remaining_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_websub_expiring',
      'idx_websub_failed',
      'idx_users_provider_token_expires'
    );

  IF array_length(remaining_indexes, 1) > 0 THEN
    RAISE WARNING 'Indexes still exist: %', array_to_string(remaining_indexes, ', ');
  ELSE
    RAISE NOTICE 'Validation passed: All unused indexes dropped successfully';
  END IF;
END $$;

-- Calculate space reclaimed
SELECT
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_space_reclaimed
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_websub_expiring',
  'idx_websub_failed',
  'idx_users_provider_token_expires'
);

-- ============================================
-- MONITORING RECOMMENDATION
-- ============================================

/*
After dropping these indexes, monitor your application for:

1. Slow queries on channel_websub_subscriptions table
   - Filtering by hub_lease_expires_at
   - Filtering by last_subscribe_attempt_at and status = 'failed'

2. Slow queries on users table
   - Filtering by provider_token_expires_at

If you notice performance degradation, use the rollback instructions below
to recreate the indexes.

Query to monitor slow queries:
------------------------------
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%channel_websub_subscriptions%'
   OR query LIKE '%provider_token_expires%'
ORDER BY mean_exec_time DESC
LIMIT 10;
*/

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

/*
To recreate the dropped indexes if needed:

-- Recreate idx_websub_expiring
CREATE INDEX CONCURRENTLY idx_websub_expiring
  ON public.channel_websub_subscriptions(hub_lease_expires_at)
  WHERE status = 'verified';

-- Recreate idx_websub_failed
CREATE INDEX CONCURRENTLY idx_websub_failed
  ON public.channel_websub_subscriptions(last_subscribe_attempt_at)
  WHERE status = 'failed';

-- Recreate idx_users_provider_token_expires
CREATE INDEX CONCURRENTLY idx_users_provider_token_expires
  ON public.users(provider_token_expires_at)
  WHERE provider_token IS NOT NULL;

Note: Index creation will be fast if the tables have few rows,
      but may take time on large tables. Use CONCURRENTLY to avoid locks.
*/

-- ============================================
-- STORAGE OPTIMIZATION
-- ============================================

-- Optional: Run VACUUM ANALYZE after dropping indexes
-- This helps reclaim space and update statistics
-- Uncomment to enable:

-- VACUUM ANALYZE public.channel_websub_subscriptions;
-- VACUUM ANALYZE public.users;
