-- ============================================
-- Migration: Phase 2 - Add Foreign Key Indexes
-- Description: Create indexes for foreign keys to improve JOIN performance
-- Risk Level: LOW
-- Estimated Time: 2 minutes
-- Rollback: Easy
-- ============================================

-- Issue: Foreign keys without covering indexes cause suboptimal query performance
-- Impact: Affects 3 tables with foreign key constraints
-- Solution: Add indexes using CONCURRENTLY to avoid table locks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for bookmarks.video_id foreign key
-- Improves performance when joining bookmarks with videos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_video_id
  ON public.bookmarks(video_id);

-- Index for user_channels.channel_id foreign key
-- Improves performance when joining user_channels with channels
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_channels_channel_id
  ON public.user_channels(channel_id);

-- Index for watch_history.video_id foreign key
-- Improves performance when joining watch_history with videos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_video_id
  ON public.watch_history(video_id);

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify all indexes were created successfully
DO $$
DECLARE
  missing_indexes text[];
BEGIN
  SELECT array_agg(idx_name)
  INTO missing_indexes
  FROM (
    SELECT 'idx_bookmarks_video_id' as idx_name
    UNION ALL
    SELECT 'idx_user_channels_channel_id'
    UNION ALL
    SELECT 'idx_watch_history_video_id'
  ) expected
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = expected.idx_name
  );

  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE EXCEPTION 'Missing indexes: %', array_to_string(missing_indexes, ', ');
  END IF;

  RAISE NOTICE 'Validation passed: All foreign key indexes created successfully';
END $$;

-- Display index details
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_bookmarks_video_id',
  'idx_user_channels_channel_id',
  'idx_watch_history_video_id'
)
ORDER BY tablename, indexname;

-- ============================================
-- PERFORMANCE VERIFICATION
-- ============================================

-- Check index usage (run this query after some production traffic)
-- This helps verify that indexes are being utilized
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_bookmarks_video_id',
  'idx_user_channels_channel_id',
  'idx_watch_history_video_id'
)
ORDER BY tablename, indexname;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- Drop indexes if rollback is required
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_bookmarks_video_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_user_channels_channel_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_watch_history_video_id;
