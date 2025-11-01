import { google, youtube_v3 } from 'googleapis';
import Parser from 'rss-parser';
import { YoutubeTranscript } from 'youtube-transcript';

export class YouTubeAPI {
  private youtube: youtube_v3.Youtube;
  private rssParser: Parser;

  constructor(apiKey?: string, accessToken?: string) {
    const auth = accessToken
      ? new google.auth.OAuth2()
      : apiKey;

    if (accessToken) {
      (auth as any).setCredentials({ access_token: accessToken });
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth,
    });

    this.rssParser = new Parser();
  }

  /**
   * Get user's subscribed channels (all of them using pagination)
   * Requires OAuth with youtube.readonly scope
   */
  async getSubscribedChannels() {
    try {
      const allChannels: Array<{
        channelId: string;
        title: string;
        description: string;
        thumbnail: string;
        publishedAt: string;
      }> = [];

      let nextPageToken: string | undefined;

      // Fetch all pages
      do {
        const response = await this.youtube.subscriptions.list({
          part: ['snippet', 'contentDetails'],
          mine: true,
          maxResults: 50, // Maximum allowed per request
          pageToken: nextPageToken,
        });

        const channels = response.data.items?.map((item) => ({
          channelId: item.snippet?.resourceId?.channelId || '',
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || '',
          publishedAt: item.snippet?.publishedAt || '',
        })) || [];

        allChannels.push(...channels);
        nextPageToken = response.data.nextPageToken || undefined;
      } while (nextPageToken);

      return allChannels;
    } catch (error) {
      console.error('Error fetching subscribed channels:', error);
      throw new Error('Failed to fetch subscribed channels');
    }
  }

  /**
   * Get channel details
   */
  async getChannelDetails(channelId: string) {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId],
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      return {
        id: channel.id || '',
        title: channel.snippet?.title || '',
        description: channel.snippet?.description || '',
        thumbnail: channel.snippet?.thumbnails?.high?.url || '',
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads || '',
      };
    } catch (error) {
      console.error('Error fetching channel details:', error);
      throw new Error('Failed to fetch channel details');
    }
  }

  /**
   * Get recent videos from channel using RSS feed
   * Does not use API quota
   */
  async getChannelVideosViaRSS(channelId: string) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const feed = await this.rssParser.parseURL(feedUrl);

      return feed.items.map((item) => ({
        videoId: item.id?.split(':')[2] || '',
        title: item.title || '',
        publishedAt: item.pubDate || '',
        link: item.link || '',
        author: item.author || '',
      }));
    } catch (error) {
      console.error('Error fetching channel videos via RSS:', error);
      throw new Error('Failed to fetch channel videos via RSS');
    }
  }

  /**
   * Get recent videos from channel uploads playlist
   * Uses API quota (1 unit per request)
   */
  async getChannelVideos(uploadsPlaylistId: string, maxResults: number = 10) {
    try {
      const response = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
      });

      return response.data.items?.map((item) => ({
        videoId: item.contentDetails?.videoId || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || '',
        publishedAt: item.snippet?.publishedAt || '',
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
      })) || [];
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw new Error('Failed to fetch channel videos');
    }
  }

  /**
   * Get video details
   * Uses API quota (1 unit per request)
   */
  async getVideoDetails(videoId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      return {
        id: video.id || '',
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        thumbnail: video.snippet?.thumbnails?.high?.url || '',
        channelId: video.snippet?.channelId || '',
        channelTitle: video.snippet?.channelTitle || '',
        publishedAt: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration || '',
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        commentCount: parseInt(video.statistics?.commentCount || '0'),
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw new Error('Failed to fetch video details');
    }
  }

  /**
   * Get video captions/transcript
   * Does not use API quota (uses youtube-transcript library)
   */
  async getCaptions(videoId: string) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      return {
        videoId,
        captions: transcript.map((item) => ({
          text: item.text,
          offset: item.offset,
          duration: item.duration,
        })),
        fullText: transcript.map((item) => item.text).join(' '),
      };
    } catch (error) {
      console.error('Error fetching captions:', error);
      return null; // Return null if no captions available
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  static parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }
}

export * from './types';
