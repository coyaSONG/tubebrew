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
