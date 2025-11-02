#!/usr/bin/env tsx
/**
 * Batch Generate AI Summaries for All Videos with Captions
 * This script generates summaries for all videos that have captions but no summaries
 *
 * Usage: npx tsx --env-file=.env src/batch-generate-summaries.ts
 */

import { YouTubeAPI } from '@tubebrew/youtube';
import { AIService } from '@tubebrew/ai';
import { supabaseAdmin } from '@tubebrew/db';

async function batchGenerateSummaries() {
  console.log('🚀 Starting Batch AI Summary Generation\n');

  try {
    // 1. Find all videos with captions that don't have summaries
    console.log('📹 Step 1: Finding videos with captions and no summaries...');
    const { data: videos } = await supabaseAdmin
      .from('videos')
      .select(
        `
        id,
        youtube_id,
        title,
        channel_id,
        channels!videos_channel_id_fkey (
          id,
          youtube_id,
          title,
          category
        )
      `
      )
      .eq('has_captions', true)
      .not('channel_id', 'is', null)
      .order('published_at', { ascending: false });

    if (!videos || videos.length === 0) {
      console.log('❌ No videos with captions found');
      return;
    }

    console.log(`Found ${videos.length} videos with captions\n`);

    // Find videos without summaries
    const videosWithoutSummaries = [];
    for (const video of videos) {
      const { data: summaries } = await supabaseAdmin
        .from('summaries')
        .select('id')
        .eq('video_id', video.id);

      if (!summaries || summaries.length === 0) {
        videosWithoutSummaries.push(video);
      }
    }

    console.log(`📊 Videos needing summaries: ${videosWithoutSummaries.length}`);
    if (videosWithoutSummaries.length === 0) {
      console.log('✅ All videos already have summaries!\n');
      return;
    }

    // 2. Process each video
    const youtube = new YouTubeAPI();
    const ai = new AIService();

    let successCount = 0;
    let failedCount = 0;
    const failedVideos = [];

    for (let i = 0; i < videosWithoutSummaries.length; i++) {
      const video = videosWithoutSummaries[i];
      console.log(
        `\n[${i + 1}/${videosWithoutSummaries.length}] Processing: ${video.title.substring(0, 60)}...`
      );
      console.log(`   YouTube ID: ${video.youtube_id}`);

      try {
        // Get captions
        console.log('   📝 Fetching captions...');
        const captionsData = await youtube.getCaptions(video.youtube_id);

        if (!captionsData || !captionsData.fullText) {
          console.log('   ⚠️  No captions available, skipping');
          failedCount++;
          failedVideos.push({ video: video.youtube_id, reason: 'No captions' });
          continue;
        }

        const transcript = captionsData.fullText;
        console.log(`   ✅ Retrieved transcript (${transcript.length} characters)`);

        // Store transcript
        const { data: existingTranscript } = await supabaseAdmin
          .from('transcripts')
          .select('id')
          .eq('video_id', video.id)
          .eq('language', 'auto')
          .single();

        if (!existingTranscript) {
          await supabaseAdmin.from('transcripts').insert({
            video_id: video.id,
            language: 'auto',
            content: transcript,
          });
        }

        // Generate summaries for all 4 levels
        const channelCategory = video.channels?.category || 'general';
        console.log('   🤖 Generating AI summaries...');

        let levelSuccessCount = 0;
        for (const level of [1, 2, 3, 4]) {
          try {
            const summary = await ai.generateSummary(video.title, transcript, {
              level: level as 1 | 2 | 3 | 4,
              channelCategory,
            });

            await supabaseAdmin.from('summaries').insert({
              video_id: video.id,
              level,
              content: summary.content,
              tokens_used: summary.tokensUsed,
              model: summary.model,
            });

            levelSuccessCount++;
            console.log(`   ✅ Level ${level} generated (${summary.tokensUsed} tokens)`);
          } catch (err) {
            console.log(`   ❌ Level ${level} failed: ${(err as Error).message}`);
          }
        }

        if (levelSuccessCount > 0) {
          successCount++;
          console.log(
            `   ✨ Success! Generated ${levelSuccessCount}/4 summaries for this video`
          );
        } else {
          failedCount++;
          failedVideos.push({ video: video.youtube_id, reason: 'All levels failed' });
        }

        // Small delay to avoid rate limiting
        if (i < videosWithoutSummaries.length - 1) {
          console.log('   ⏳ Waiting 2s before next video...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`   ❌ Error processing video: ${(error as Error).message}`);
        failedCount++;
        failedVideos.push({
          video: video.youtube_id,
          reason: (error as Error).message,
        });
      }
    }

    // 3. Final summary
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Batch Processing Complete!\n');
    console.log(`✅ Successfully processed: ${successCount} videos`);
    console.log(`❌ Failed: ${failedCount} videos\n`);

    if (failedVideos.length > 0) {
      console.log('Failed videos:');
      failedVideos.forEach(({ video, reason }) => {
        console.log(`  - ${video}: ${reason}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verify total summaries in database
    const { data: allSummaries } = await supabaseAdmin
      .from('summaries')
      .select('id, video_id');

    const uniqueVideos = new Set(allSummaries?.map((s) => s.video_id) || []);

    console.log(`\n📊 Total videos with summaries in DB: ${uniqueVideos.size}`);
    console.log(`📊 Total summaries in DB: ${allSummaries?.length || 0}`);
  } catch (error) {
    console.error('\n❌ Batch processing failed:', error);
    throw error;
  }
}

// Run the batch process
batchGenerateSummaries()
  .then(() => {
    console.log('\n✅ Batch script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Batch script failed:', error);
    process.exit(1);
  });
