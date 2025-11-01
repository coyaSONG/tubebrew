// YouTube API types

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
  };
  subscriberCount: number;
  videoCount: number;
}

export interface YouTubeVideo {
  id: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    standard?: string;
    maxres?: string;
  };
  publishedAt: string;
  duration: string; // ISO 8601 format
  viewCount: number;
  likeCount: number;
}
