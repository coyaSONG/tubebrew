import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { YouTubeAPI } from '@tubebrew/youtube';
import { DBUtils, supabaseAdmin } from '@tubebrew/db';
import type { VideoProcessingJob, SummaryGenerationJob } from '@tubebrew/types';

// Use admin client to bypass RLS
const db = new DBUtils(supabaseAdmin);

// Redis connection for queue access
const redisConnection = new Redis(
  process.env.NODE_ENV === 'production'
    ? process.env.REDIS_URL!
    : process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);

// Summary generation queue
const summaryQueue = new Queue<SummaryGenerationJob>('summary-generation', {
  connection: redisConnection,
});

/**
 * Video Collection Job Handler
 * Polls RSS feeds for new videos from subscribed channels
 */
export async function processVideoCollection(job: Job<VideoProcessingJob>) {
  const { userId, channelId } = job.data;

  job.log(`Starting video collection for channel ${channelId}, user ${userId}`);

  try {
    // 1. Get user's provider token for YouTube API
    if (!userId) {
      throw new Error('userId is required for video collection');
    }
    const user = await db.getUser(userId);
    if (!user || !user.provider_token) {
      throw new Error('User not found or provider token missing');
    }

    // 2. Initialize YouTube API with user's OAuth token (second parameter)
    const youtube = new YouTubeAPI(undefined, user.provider_token);

    // 3. Fetch recent videos from channel via RSS (quota-free)
    const rssVideos = await youtube.getChannelVideosViaRSS(channelId);
    job.log(`Found ${rssVideos.length} videos from RSS feed`);

    // 4. Get channel details to ensure it exists in DB
    const channel = await db.getChannelByYouTubeId(channelId);
    if (!channel) {
      job.log(`Channel ${channelId} not found in database, skipping`);
      return { success: true, videosProcessed: 0, skipped: true };
    }

    let newVideos = 0;
    let updatedVideos = 0;

    // 5. Process each video
    for (const rssVideo of rssVideos) {
      try {
        const videoId = rssVideo.videoId;

        // Check if video already exists
        const existing = await db.getVideoByYouTubeId(videoId);

        if (existing) {
          // Fetch latest video details to update metadata
          const videoDetails = await youtube.getVideoDetails(videoId);

          await db.updateVideo(existing.id, {
            view_count: videoDetails.viewCount,
            updated_at: new Date().toISOString(),
          });
          updatedVideos++;
        } else {
          // Fetch full video details for new videos
          const videoDetails = await youtube.getVideoDetails(videoId);
          const duration = YouTubeAPI.parseDuration(videoDetails.duration);

          // Create new video record
          await db.createVideo({
            youtube_id: videoId,
            channel_id: channel.id,
            title: videoDetails.title,
            description: videoDetails.description || '',
            thumbnail_url: videoDetails.thumbnail,
            published_at: new Date(videoDetails.publishedAt).toISOString(),
            duration,
            view_count: videoDetails.viewCount || 0,
          });
          newVideos++;

          // Add to summary generation queue
          await summaryQueue.add(
            `summary-${videoId}`,
            {
              videoId,
              channelId,
              userId,
              priority: 'normal' as const,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            }
          );
        }
      } catch (err) {
        job.log(`Error processing video ${rssVideo.videoId}: ${(err as Error).message}`);
        // Continue with next video
      }
    }

    job.log(`Collection complete: ${newVideos} new, ${updatedVideos} updated`);

    return {
      success: true,
      videosProcessed: rssVideos.length,
      newVideos,
      updatedVideos,
    };
  } catch (error) {
    job.log(`Error in video collection: ${(error as Error).message}`);
    throw error;
  }
}
