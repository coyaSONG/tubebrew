// Common types for TubeBrew

export interface User {
  id: string;
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  youtubeChannelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  youtubeId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  subscriberCount?: number;
  videoCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  youtubeId: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  publishedAt: Date;
  viewCount?: number;
  likeCount?: number;
  hasCaptions: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Summary {
  id: string;
  videoId: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  model?: string;
  tokensUsed?: number;
  createdAt: Date;
}

export type SummaryLevel = 1 | 2 | 3 | 4;

export interface UserSettings {
  userId: string;
  summaryLevel: SummaryLevel;
  notificationType: 'realtime' | 'daily' | 'weekly' | 'none';
  notificationTime?: string;
  youtubeSyncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserChannel {
  userId: string;
  channelId: string;
  customCategory?: string;
  isHidden: boolean;
  notificationEnabled: boolean;
  customSummaryLevel?: SummaryLevel;
  createdAt: Date;
}

export interface Transcript {
  id: string;
  videoId: string;
  source: 'youtube' | 'whisper';
  language: string;
  content: string;
  createdAt: Date;
}

export interface Bookmark {
  userId: string;
  videoId: string;
  priority: 1 | 2 | 3;
  createdAt: Date;
}

export interface WatchHistory {
  userId: string;
  videoId: string;
  watchedAt: Date;
  source: 'tubebrew' | 'youtube';
}

// Extended types for API responses
export interface VideoWithChannel extends Video {
  channel: Channel;
  summaries?: Summary[];
}

export interface DashboardVideo extends VideoWithChannel {
  isBookmarked: boolean;
  isWatched: boolean;
  userSummaryLevel: SummaryLevel;
}

// Job Queue Types
export interface VideoProcessingJob {
  userId: string | null; // null for WebSub-triggered jobs
  channelId: string; // YouTube channel ID
  videoId?: string; // Optional specific video ID (for WebSub)
  source?: 'websub' | 'rss'; // Track notification source
}

export interface SummaryGenerationJob {
  videoId: string; // YouTube video ID
  channelId: string; // YouTube channel ID
  userId: string | null; // null for WebSub-triggered jobs
  priority?: 'normal' | 'high' | 'low';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
