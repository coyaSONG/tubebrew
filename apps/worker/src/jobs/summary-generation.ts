import { Job } from 'bullmq';
import { YouTubeAPI } from '@tubebrew/youtube';
import { AIService } from '@tubebrew/ai';
import { DBUtils, supabaseAdmin } from '@tubebrew/db';
import type { SummaryGenerationJob } from '@tubebrew/types';

/**
 * Summary Generation Job Handler
 * Generates AI summaries for videos at multiple levels
 */
export async function processSummaryGeneration(job: Job<SummaryGenerationJob>) {
  const { videoId, channelId, userId, priority = 'normal' } = job.data;

  job.log(`Starting summary generation for video ${videoId}`);

  try {
    // Use admin client for worker operations
    const dbUtils = new DBUtils(supabaseAdmin);

    // 1. Get video from database
    const video = await dbUtils.getVideoByYouTubeId(videoId);
    if (!video) {
      throw new Error(`Video ${videoId} not found in database`);
    }

    // 2. Check if summaries already exist
    const { data: existingSummaries } = await supabaseAdmin
      .from('summaries')
      .select('level')
      .eq('video_id', video.id);

    if (existingSummaries && existingSummaries.length >= 4) {
      job.log(`All summaries already exist for video ${videoId}`);
      return { success: true, skipped: true, reason: 'already_exists' };
    }

    // 3. Get user for provider token
    if (!userId) {
      throw new Error('userId is required for summary generation');
    }
    const user = await dbUtils.getUser(userId);
    if (!user || !user.provider_token) {
      throw new Error('User not found or provider token missing');
    }

    // 4. Get channel for category context
    const channel = await dbUtils.getChannelByYouTubeId(channelId);
    const channelCategory = channel?.category || 'general';

    // 5. Get video transcript
    const youtube = new YouTubeAPI(user.provider_token);
    let transcript: string;

    try {
      const captionsData = await youtube.getCaptions(videoId);
      if (!captionsData) {
        throw new Error('No captions available');
      }
      transcript = captionsData.fullText;
      job.log(`Retrieved transcript (${transcript.length} characters)`);

      // Store transcript
      const { data: existingTranscript } = await supabaseAdmin
        .from('transcripts')
        .select('id')
        .eq('video_id', video.id)
        .eq('language', 'ko')
        .single();

      if (!existingTranscript) {
        await supabaseAdmin.from('transcripts').insert({
          video_id: video.id,
          language: 'ko',
          content: transcript,
        });
      }
    } catch (err) {
      job.log(`Failed to get transcript: ${(err as Error).message}`);
      throw new Error(`No transcript available for video ${videoId}`);
    }

    // 6. Initialize AI service
    const ai = new AIService();

    // 7. Generate summaries for each level
    const summariesToGenerate = [1, 2, 3, 4].filter(
      (level) => !existingSummaries?.some((s) => s.level === level)
    );

    job.log(`Generating summaries for levels: ${summariesToGenerate.join(', ')}`);

    const results = [];

    for (const level of summariesToGenerate) {
      try {
        const summary = await ai.generateSummary(video.title, transcript, {
          level: level as 1 | 2 | 3 | 4,
          channelCategory,
        });

        // Store summary
        await supabaseAdmin.from('summaries').insert({
          video_id: video.id,
          level,
          content: summary.content,
          tokens_used: summary.tokensUsed,
          model_used: summary.model,
        });

        results.push({
          level,
          length: summary.content.length,
          tokens: summary.tokensUsed,
        });

        job.log(`Generated level ${level} summary (${summary.content.length} chars, ${summary.tokensUsed} tokens)`);
      } catch (err) {
        job.log(`Error generating level ${level} summary: ${(err as Error).message}`);
        // Continue with other levels
      }
    }

    return {
      success: true,
      videoId,
      summariesGenerated: results.length,
      results,
    };
  } catch (error) {
    job.log(`Error in summary generation: ${(error as Error).message}`);
    throw error;
  }
}
