-- TubeBrew Initial Database Schema
-- Version: 1.0
-- Created: 2025-11-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
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

-- User Settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary_level INTEGER DEFAULT 2 CHECK (summary_level BETWEEN 1 AND 4),
  notification_type VARCHAR(50) DEFAULT 'daily',
  notification_time TIME DEFAULT '08:00:00',
  youtube_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Channels
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

-- User Channels (구독 관계)
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

-- Videos
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

-- Transcripts
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  source VARCHAR(50), -- 'youtube', 'whisper'
  language VARCHAR(10),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Summaries
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  level INTEGER CHECK (level BETWEEN 1 AND 4),
  content TEXT NOT NULL,
  model VARCHAR(100), -- 'gpt-4o-mini', 'claude-sonnet-4'
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookmarks (나중에 보기)
CREATE TABLE bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- Watch History
CREATE TABLE watch_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50), -- 'tubebrew', 'youtube'
  PRIMARY KEY (user_id, video_id)
);

-- Indexes
CREATE INDEX idx_videos_channel_published ON videos(channel_id, published_at DESC);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_user_channels_user ON user_channels(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_watch_history_user ON watch_history(user_id, watched_at DESC);
CREATE INDEX idx_transcripts_video ON transcripts(video_id);
CREATE INDEX idx_summaries_video_level ON summaries(video_id, level);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- Users can read/create/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = google_id);

CREATE POLICY "Users can create own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = google_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);

-- User Settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- User Channels policies
CREATE POLICY "Users can view own channels" ON user_channels
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can manage own channels" ON user_channels
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Watch History policies
CREATE POLICY "Users can view own history" ON watch_history
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can manage own history" ON watch_history
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Channels, Videos, Transcripts, Summaries are publicly readable
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels are publicly readable" ON channels FOR SELECT USING (true);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos are publicly readable" ON videos FOR SELECT USING (true);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transcripts are publicly readable" ON transcripts FOR SELECT USING (true);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Summaries are publicly readable" ON summaries FOR SELECT USING (true);

-- Functions
-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user in public.users when they sign up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (google_id, email, name, avatar_url)
  VALUES (
    NEW.id::text,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (google_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user on sign up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
