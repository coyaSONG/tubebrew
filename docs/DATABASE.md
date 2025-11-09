# TubeBrew Database Schema Documentation

**Database**: Supabase (PostgreSQL 15)
**Version**: 1.0
**Last Migration**: 2025-11-02

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Row Level Security](#row-level-security)
6. [Migrations](#migrations)
7. [Query Examples](#query-examples)
8. [Best Practices](#best-practices)

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├──────────┬──────────────────┬──────────────┬───────────────┐
       │          │                  │              │               │
       ▼          ▼                  ▼              ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐
│user_settings│  │user_channels │  │bookmarks │  │watch_history│  │(auth)     │
└─────────────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘  └───────────┘
                        │               │              │
                        ▼               │              │
                 ┌──────────┐           │              │
                 │ channels │           │              │
                 └────┬─────┘           │              │
                      │                 │              │
                      ▼                 ▼              ▼
                 ┌──────────────────────────────────────┐
                 │             videos                   │
                 └────┬─────────────────────────────┬───┘
                      │                             │
              ┌───────┴────────┐          ┌─────────┴─────────┐
              ▼                ▼          ▼                   ▼
        ┌──────────┐    ┌──────────┐    ┌──────────────────────┐
        │transcripts│    │summaries │    │websub_subscriptions  │
        └──────────┘    └──────────┘    └──────────────────────┘
```

### Table Summary

| Table | Purpose | Records (Estimated) | Growth Rate |
|-------|---------|---------------------|-------------|
| users | User accounts | 1-100 | Low |
| user_settings | User preferences | 1-100 | Low |
| channels | YouTube channels | 50-500 | Medium |
| user_channels | User-channel relationships | 50-5000 | Medium |
| videos | Video metadata | 1,000-100,000 | High |
| transcripts | Video captions | 500-50,000 | Medium |
| summaries | AI summaries (4 levels) | 2,000-200,000 | High |
| bookmarks | Saved videos | 10-1,000 | Low |
| watch_history | View tracking | 100-10,000 | Medium |
| websub_subscriptions | WebSub state | 50-500 | Low |

---

## Core Tables

### users

**Purpose**: User account information from Google OAuth

**Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  youtube_channel_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID (primary key)
- `google_id`: Google OAuth subject ID (unique, used for RLS)
- `email`: User's email address
- `name`: Display name from Google
- `avatar_url`: Profile picture URL
- `youtube_channel_id`: User's YouTube channel ID (if they have one)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update

**Indexes**:
- Primary key on `id`
- Unique constraint on `google_id`

**RLS Policies**:
- Users can SELECT/INSERT/UPDATE only their own data
- Match: `auth.uid()::text = google_id`

**Example Data**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "google_id": "103547991597142817347",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "youtube_channel_id": "UCxxx",
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z"
}
```

---

### user_settings

**Purpose**: User preferences and configuration

**Schema**:
```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary_level INTEGER DEFAULT 2 CHECK (summary_level BETWEEN 1 AND 4),
  notification_type VARCHAR(50) DEFAULT 'daily',
  notification_time TIME DEFAULT '08:00:00',
  youtube_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `user_id`: Foreign key to users (primary key)
- `summary_level`: Default AI summary detail (1-4)
  - 1: One-line (~20 chars)
  - 2: Three-line (~150 chars)
  - 3: Chapter breakdown
  - 4: Full transcript
- `notification_type`: Alert frequency
  - `realtime`: Immediate push notifications
  - `daily`: Daily digest
  - `weekly`: Weekly summary
  - `off`: No notifications
- `notification_time`: When to send daily digest (HH:MM:SS)
- `youtube_sync_enabled`: Sync YouTube watch history

**Constraints**:
- `summary_level` must be 1-4
- Cascades on user deletion

**RLS Policies**:
- Users can SELECT/UPDATE only their own settings

**Example Data**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary_level": 2,
  "notification_type": "daily",
  "notification_time": "08:00:00",
  "youtube_sync_enabled": true
}
```

---

### channels

**Purpose**: YouTube channel metadata

**Schema**:
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(100),
  subscriber_count BIGINT,
  video_count BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID
- `youtube_id`: YouTube channel ID (UCxxx format)
- `title`: Channel name
- `description`: Channel description
- `thumbnail_url`: Channel avatar URL
- `category`: AI-classified category (see categories below)
- `subscriber_count`: Subscriber count (updated periodically)
- `video_count`: Total videos (updated periodically)

**Categories**:
```
개발/기술, 음악/엔터, 뉴스, 교육, 라이프스타일,
게임, 스포츠, 요리, 여행, 과학, 비즈니스,
건강/피트니스, 예술, 코미디, 기타
```

**Indexes**:
- Primary key on `id`
- Unique constraint on `youtube_id`

**RLS**: None (public data)

---

### user_channels

**Purpose**: Many-to-many relationship between users and channels

**Schema**:
```sql
CREATE TABLE user_channels (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  custom_category VARCHAR(100),
  is_hidden BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  custom_summary_level INTEGER CHECK (custom_summary_level BETWEEN 1 AND 4),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);
```

**Fields**:
- `user_id`: Foreign key to users
- `channel_id`: Foreign key to channels
- `custom_category`: User's custom category (overrides channel.category)
- `is_hidden`: Hide channel from feed
- `notification_enabled`: Enable notifications for this channel
- `custom_summary_level`: Override default summary level for this channel

**Indexes**:
- Composite primary key on (user_id, channel_id)
- Index on `user_id` for fast user queries

**RLS Policies**:
- Users can SELECT/INSERT/UPDATE/DELETE only their own channel relationships

---

### videos

**Purpose**: Video metadata and status

**Schema**:
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(255) UNIQUE NOT NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- seconds
  published_at TIMESTAMP NOT NULL,
  view_count BIGINT,
  like_count BIGINT,
  has_captions BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID
- `youtube_id`: YouTube video ID (11 characters)
- `channel_id`: Foreign key to channels
- `title`: Video title
- `description`: Video description
- `thumbnail_url`: Video thumbnail URL
- `duration`: Video length in seconds
- `published_at`: YouTube publish timestamp
- `view_count`: View count (updated periodically)
- `like_count`: Like count (updated periodically)
- `has_captions`: Whether captions/transcript available

**Indexes**:
- Primary key on `id`
- Unique constraint on `youtube_id`
- Composite index on `(channel_id, published_at DESC)` for feed queries
- Index on `published_at DESC` for chronological queries

**RLS**: None (public data)

---

### transcripts

**Purpose**: Video captions and transcripts

**Schema**:
```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  source VARCHAR(50), -- 'youtube', 'whisper'
  language VARCHAR(10),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID
- `video_id`: Foreign key to videos
- `source`: Transcript source
  - `youtube`: Downloaded from YouTube captions
  - `whisper`: Generated via Whisper API
- `language`: Language code (e.g., 'en', 'ko')
- `content`: Full transcript text

**Indexes**:
- Primary key on `id`
- Index on `video_id` for fast video lookups

**RLS**: None (accessed via video relationships)

**Storage**: Large text field, can grow to 10KB+ per video

---

### summaries

**Purpose**: AI-generated video summaries at different detail levels

**Schema**:
```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  level INTEGER CHECK (level BETWEEN 1 AND 4),
  content TEXT NOT NULL,
  model VARCHAR(100), -- 'gpt-4o-mini', 'claude-sonnet-4', etc.
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID
- `video_id`: Foreign key to videos
- `level`: Summary detail level (1-4)
- `content`: Summary text
- `model`: LLM model used for generation
- `tokens_used`: Token count for cost tracking

**Summary Levels**:
1. One-line summary (~20 characters)
2. Three-line summary (~150 characters)
3. Chapter breakdown with timestamps
4. Full transcript (rarely used)

**Indexes**:
- Primary key on `id`
- Composite index on `(video_id, level)` for fast level lookups

**RLS**: None (accessed via video relationships)

**Example Data**:
```json
{
  "id": "...",
  "video_id": "...",
  "level": 2,
  "content": "React 19 introduces Server Components for better performance.\nNew hooks like useFormStatus simplify form handling.\nBreaking changes require migration from React 18.",
  "model": "gpt-4o-mini",
  "tokens_used": 245,
  "created_at": "2025-11-08T10:05:00Z"
}
```

---

### bookmarks

**Purpose**: User's saved videos (Watch Later)

**Schema**:
```sql
CREATE TABLE bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);
```

**Fields**:
- `user_id`: Foreign key to users
- `video_id`: Foreign key to videos
- `priority`: Importance level
  - 1: Normal
  - 2: Important
  - 3: Urgent
- `created_at`: Bookmark timestamp

**Indexes**:
- Composite primary key on (user_id, video_id)
- Index on `(user_id, created_at DESC)` for chronological lists

**RLS Policies**:
- Users can SELECT/INSERT/DELETE only their own bookmarks

---

### watch_history

**Purpose**: Track which videos users have watched

**Schema**:
```sql
CREATE TABLE watch_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50), -- 'tubebrew', 'youtube'
  PRIMARY KEY (user_id, video_id)
);
```

**Fields**:
- `user_id`: Foreign key to users
- `video_id`: Foreign key to videos
- `watched_at`: When video was watched
- `source`: Where it was watched
  - `tubebrew`: Watched via TubeBrew
  - `youtube`: Synced from YouTube

**Indexes**:
- Composite primary key on (user_id, video_id)
- Index on `(user_id, watched_at DESC)` for recent history

**RLS Policies**:
- Users can SELECT/INSERT only their own history

---

### websub_subscriptions

**Purpose**: Track YouTube WebSub (PubSubHubbub) subscriptions

**Schema**:
```sql
CREATE TABLE websub_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  topic_url TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields**:
- `id`: Internal UUID
- `channel_id`: Foreign key to channels
- `topic_url`: YouTube feed URL (https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCxxx)
- `callback_url`: TubeBrew webhook URL
- `status`: Subscription state
  - `pending`: Awaiting verification
  - `active`: Verified and receiving notifications
  - `expired`: Lease expired
  - `failed`: Verification/renewal failed
- `expires_at`: When subscription expires (typically 5-10 days)
- `last_verified_at`: Last successful verification
- `retry_count`: Failed renewal attempts

**Indexes**:
- Primary key on `id`
- Index on `channel_id`
- Index on `expires_at` for renewal scheduling

**RLS**: None (system table)

---

## Relationships

### One-to-One
- `users` ↔ `user_settings`

### One-to-Many
- `users` → `user_channels`
- `users` → `bookmarks`
- `users` → `watch_history`
- `channels` → `user_channels`
- `channels` → `videos`
- `channels` → `websub_subscriptions`
- `videos` → `transcripts`
- `videos` → `summaries`
- `videos` → `bookmarks`
- `videos` → `watch_history`

### Many-to-Many
- `users` ↔ `channels` (via `user_channels`)

---

## Indexes

### Performance Indexes

**Feed Queries** (Most Important):
```sql
-- Fast video feed per channel
CREATE INDEX idx_videos_channel_published
  ON videos(channel_id, published_at DESC);

-- Fast global video feed
CREATE INDEX idx_videos_published
  ON videos(published_at DESC);
```

**User Data Lookups**:
```sql
-- Fast user channel lookups
CREATE INDEX idx_user_channels_user
  ON user_channels(user_id);

-- Fast bookmark lists
CREATE INDEX idx_bookmarks_user
  ON bookmarks(user_id, created_at DESC);

-- Fast watch history
CREATE INDEX idx_watch_history_user
  ON watch_history(user_id, watched_at DESC);
```

**Related Data Lookups**:
```sql
-- Fast transcript lookups
CREATE INDEX idx_transcripts_video
  ON transcripts(video_id);

-- Fast summary lookups by level
CREATE INDEX idx_summaries_video_level
  ON summaries(video_id, level);
```

### Query Optimization

**Efficient Feed Query**:
```sql
-- Uses idx_videos_channel_published
SELECT v.*, c.title as channel_title
FROM videos v
JOIN channels c ON v.channel_id = c.id
JOIN user_channels uc ON c.id = uc.channel_id
WHERE uc.user_id = $1
  AND uc.is_hidden = false
ORDER BY v.published_at DESC
LIMIT 20;
```

**Efficient Summary Lookup**:
```sql
-- Uses idx_summaries_video_level
SELECT content
FROM summaries
WHERE video_id = $1 AND level = 2;
```

---

## Row Level Security (RLS)

### Enabled Tables

RLS is enabled on all user-specific tables:
- `users`
- `user_settings`
- `user_channels`
- `bookmarks`
- `watch_history`

### Policy Pattern

All policies use `google_id` for user matching (NOT `id`):

```sql
-- ✅ Correct
auth.uid()::text = google_id

-- ❌ Wrong (causes auth loops)
auth.uid()::text = id::text
```

### Policy Examples

**Users Table**:
```sql
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = google_id);

CREATE POLICY "Users can create own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = google_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);
```

**User Channels Table**:
```sql
CREATE POLICY "Users can view own channels" ON user_channels
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage own channels" ON user_channels
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )
  );
```

### RLS Testing

```sql
-- Set user context for testing
SET request.jwt.claims = '{"sub": "103547991597142817347"}';

-- Test user data access
SELECT * FROM users; -- Should return only current user
SELECT * FROM user_channels; -- Should return only current user's channels
```

---

## Migrations

### Migration Files

Located in `packages/db/migrations/`:

1. **20251101000001_initial_schema.sql**
   - Creates all core tables
   - Sets up indexes
   - Enables RLS and creates policies

2. **20251102000001_add_provider_token.sql**
   - Adds `provider_token` JSONB column to users
   - Stores OAuth tokens for YouTube API

3. **20251102000002_add_websub_subscriptions.sql**
   - Creates `websub_subscriptions` table
   - Adds indexes for renewal scheduling

4. **20251102000003_add_user_settings_insert_policy.sql**
   - Adds INSERT policy for user_settings
   - Allows auto-creation on first access

### Migration Process

**Development**:
1. Create new migration file: `YYYYMMDDHHMMSS_description.sql`
2. Write SQL changes
3. Test locally in Supabase SQL Editor
4. Commit migration file

**Production**:
1. Connect to Supabase project
2. Open SQL Editor
3. Copy migration file contents
4. Execute SQL
5. Verify changes

### Rollback Strategy

Create down migrations for reversibility:

```sql
-- Migration: add_column.sql
ALTER TABLE videos ADD COLUMN new_field TEXT;

-- Rollback: down_add_column.sql
ALTER TABLE videos DROP COLUMN new_field;
```

---

## Query Examples

### Get User's Video Feed

```sql
SELECT
  v.id,
  v.youtube_id,
  v.title,
  v.thumbnail_url,
  v.duration,
  v.published_at,
  c.title as channel_title,
  c.category,
  COALESCE(
    (SELECT content FROM summaries WHERE video_id = v.id AND level = 2 LIMIT 1),
    ''
  ) as summary,
  EXISTS(
    SELECT 1 FROM bookmarks
    WHERE user_id = $1 AND video_id = v.id
  ) as is_bookmarked,
  EXISTS(
    SELECT 1 FROM watch_history
    WHERE user_id = $1 AND video_id = v.id
  ) as is_watched
FROM videos v
JOIN channels c ON v.channel_id = c.id
JOIN user_channels uc ON c.id = uc.channel_id
WHERE uc.user_id = $1
  AND uc.is_hidden = false
  AND (
    $2 = 'all' OR c.category = $2 OR uc.custom_category = $2
  )
ORDER BY v.published_at DESC
LIMIT $3 OFFSET $4;
```

**Parameters**:
- `$1`: user_id
- `$2`: category filter ('all' or specific category)
- `$3`: limit
- `$4`: offset

---

### Get Video with All Summaries

```sql
SELECT
  v.*,
  c.title as channel_title,
  c.category,
  json_agg(
    json_build_object(
      'level', s.level,
      'content', s.content,
      'model', s.model
    ) ORDER BY s.level
  ) as summaries
FROM videos v
JOIN channels c ON v.channel_id = c.id
LEFT JOIN summaries s ON v.id = s.video_id
WHERE v.youtube_id = $1
GROUP BY v.id, c.title, c.category;
```

---

### Get User's Bookmarked Videos

```sql
SELECT
  v.*,
  c.title as channel_title,
  b.priority,
  b.created_at as bookmarked_at
FROM bookmarks b
JOIN videos v ON b.video_id = v.id
JOIN channels c ON v.channel_id = c.id
WHERE b.user_id = $1
ORDER BY b.priority DESC, b.created_at DESC;
```

---

### Get Statistics

```sql
-- User's video stats
SELECT
  COUNT(*) FILTER (WHERE published_at > NOW() - INTERVAL '7 days') as videos_this_week,
  COUNT(DISTINCT channel_id) as subscribed_channels,
  COUNT(*) FILTER (WHERE EXISTS(
    SELECT 1 FROM watch_history wh
    WHERE wh.video_id = v.id AND wh.user_id = $1
  )) as watched_count,
  COUNT(*) FILTER (WHERE EXISTS(
    SELECT 1 FROM bookmarks b
    WHERE b.video_id = v.id AND b.user_id = $1
  )) as bookmarked_count
FROM videos v
JOIN channels c ON v.channel_id = c.id
JOIN user_channels uc ON c.id = uc.channel_id
WHERE uc.user_id = $1;
```

---

## Best Practices

### Query Optimization

1. **Use Indexes**: Always filter on indexed columns
   ```sql
   -- Good (uses index)
   WHERE channel_id = $1 AND published_at > $2

   -- Bad (full table scan)
   WHERE LOWER(title) LIKE '%react%'
   ```

2. **Limit Results**: Always use LIMIT for lists
   ```sql
   SELECT * FROM videos ORDER BY published_at DESC LIMIT 20;
   ```

3. **Select Specific Columns**: Avoid SELECT *
   ```sql
   -- Good
   SELECT id, title, published_at FROM videos

   -- Bad (retrieves unnecessary data)
   SELECT * FROM videos
   ```

### Data Integrity

1. **Use Transactions**: For multi-table operations
   ```sql
   BEGIN;
   INSERT INTO channels (...) VALUES (...) RETURNING id;
   INSERT INTO user_channels (user_id, channel_id) VALUES ($1, $2);
   COMMIT;
   ```

2. **Validate Constraints**: Trust database constraints
   - Use CHECK constraints for value ranges
   - Use FOREIGN KEY for relationships
   - Use UNIQUE for uniqueness

3. **Handle Conflicts**: Use UPSERT for idempotency
   ```sql
   INSERT INTO channels (youtube_id, title)
   VALUES ($1, $2)
   ON CONFLICT (youtube_id) DO UPDATE
   SET title = EXCLUDED.title, updated_at = NOW();
   ```

### Performance

1. **Batch Operations**: Insert multiple rows at once
   ```sql
   INSERT INTO summaries (video_id, level, content)
   VALUES
     ($1, 1, $2),
     ($1, 2, $3),
     ($1, 3, $4);
   ```

2. **Use Connection Pooling**: Supabase handles this automatically

3. **Monitor Slow Queries**: Enable query logging
   ```sql
   -- In Supabase dashboard: Database > Logs
   ```

### Security

1. **Never Bypass RLS**: Always use authenticated client
2. **Validate Input**: Use parameterized queries
3. **Audit Access**: Review RLS policies regularly

---

## Changelog

### Version 1.0 (2025-11-08)
- Initial database documentation
- All core tables documented
- RLS policies explained
- Query examples provided

---

**Maintained By**: TubeBrew Development Team
**Last Updated**: 2025-11-08
