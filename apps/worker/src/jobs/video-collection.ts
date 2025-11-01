import { Job } from 'bullmq';
import { YouTubeAPI } from '@tubebrew/youtube';
import { DBUtils } from '@tubebrew/db';
import type { VideoProcessingJob } from '@tubebrew/types';

/**
 * Video Collection Job Handler
 * Polls RSS feeds for new videos from subscribed channels
 */
export async function processVideoCollection(job: Job<VideoProcessingJob>) {
  const { userId, channelId } = job.data;

  job.log(`Starting video collection for channel ${channelId}, user ${userId}`);

  try {
    // 1. Get user's provider token for YouTube API
    const user = await DBUtils.getUser(userId);
    if (!user || !user.provider_token) {
      throw new Error('User not found or provider token missing');
    }

    // 2. Initialize YouTube API with user's token
    const youtube = new YouTubeAPI(user.provider_token);

    // 3. Fetch recent videos from channel via RSS (quota-free)
    const videos = await youtube.getChannelVideosViaRSS(channelId);
    job.log(`Found ${videos.length} videos from RSS feed`);

    // 4. Get channel details to ensure it exists in DB
    const channel = await DBUtils.getChannelByYouTubeId(channelId);
    if (!channel) {
      job.log(`Channel ${channelId} not found in database, skipping`);
      return { success: true, videosProcessed: 0, skipped: true };
    }

    let newVideos = 0;
    let updatedVideos = 0;

    // 5. Process each video
    for (const video of videos) {
      try {
        // Check if video already exists
        const existing = await DBUtils.getVideoByYouTubeId(video.id);

        if (existing) {
          // Update video metadata if needed
          await DBUtils.updateVideo(existing.id, {
            view_count: video.viewCount,
            updated_at: new Date(),
          });
          updatedVideos++;
        } else {
          // Create new video record
          await DBUtils.createVideo({
            youtube_id: video.id,
            channel_id: channel.id,
            title: video.title,
            description: video.description || '',
            thumbnail_url: video.thumbnail,
            published_at: video.publishedAt,
            duration: video.duration || 0,
            view_count: video.viewCount || 0,
          });
          newVideos++;

          // Add to summary generation queue
          await job.queue.add(
            'summary-generation',
            {
              videoId: video.id,
              channelId,
              userId,
              priority: 'normal',
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
        job.log(`Error processing video ${video.id}: ${(err as Error).message}`);
        // Continue with next video
      }
    }

    job.log(`Collection complete: ${newVideos} new, ${updatedVideos} updated`);

    return {
      success: true,
      videosProcessed: videos.length,
      newVideos,
      updatedVideos,
    };
  } catch (error) {
    job.log(`Error in video collection: ${(error as Error).message}`);
    throw error;
  }
}
