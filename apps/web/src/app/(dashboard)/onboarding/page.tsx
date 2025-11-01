'use client';

import { useEffect, useState, useTransition } from 'react';
import { ChannelWithCategory, DEFAULT_CATEGORIES } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { saveChannels } from './actions';

export default function OnboardingPage() {
  const [step, setStep] = useState<'loading' | 'classify' | 'review' | 'saving'>('loading');
  const [channels, setChannels] = useState<ChannelWithCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1: YouTube 구독 채널 가져오기
  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch('/api/youtube/subscriptions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscriptions');
      }

      const channelsData: ChannelWithCategory[] = data.data.map((ch: any) => ({
        channelId: ch.channelId,
        title: ch.title,
        description: ch.description,
        thumbnail: ch.thumbnail,
        publishedAt: ch.publishedAt,
        isHidden: false,
      }));

      setChannels(channelsData);
      setStep('classify');

      // Step 2: AI 자동 분류 시작
      await classifyChannels(channelsData);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Step 2: AI로 채널 분류
  const classifyChannels = async (channelsToClassify: ChannelWithCategory[]) => {
    const promises = channelsToClassify.map(async (channel) => {
      try {
        // 분류 중 표시
        setChannels((prev) =>
          prev.map((ch) =>
            ch.channelId === channel.channelId ? { ...ch, isClassifying: true } : ch
          )
        );

        // 최근 영상 제목 가져오기 (RSS 사용, API quota 소모 없음)
        let recentVideoTitles: string[] = [];
        try {
          const videoResponse = await fetch(`/api/youtube/channel-videos?channelId=${channel.channelId}`);
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            recentVideoTitles = videoData.titles || [];
          }
        } catch (err) {
          console.warn(`Failed to fetch videos for ${channel.title}:`, err);
          // 영상 가져오기 실패해도 분류는 진행
        }

        const response = await fetch('/api/channels/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: channel.channelId,
            title: channel.title,
            description: channel.description,
            recentVideoTitles,
          }),
        });

        const data = await response.json();
        const category = data.category || '기타';

        // 분류 완료
        setChannels((prev) =>
          prev.map((ch) =>
            ch.channelId === channel.channelId
              ? { ...ch, category, isClassifying: false }
              : ch
          )
        );

        return { channelId: channel.channelId, category };
      } catch (err) {
        console.error(`Failed to classify channel ${channel.title}:`, err);

        // 실패 시 기타로 설정
        setChannels((prev) =>
          prev.map((ch) =>
            ch.channelId === channel.channelId
              ? { ...ch, category: '기타', isClassifying: false }
              : ch
          )
        );

        return { channelId: channel.channelId, category: '기타' };
      }
    });

    await Promise.all(promises);
    setStep('review');
  };

  // Step 3: 사용자가 검토/수정 후 저장
  const handleSave = () => {
    setStep('saving');
    setError(null);

    startTransition(async () => {
      try {
        await saveChannels({
          channels: channels.map((ch) => ({
            youtubeId: ch.channelId,
            title: ch.title,
            description: ch.description,
            thumbnailUrl: ch.thumbnail,
            category: ch.category,
            customCategory: ch.customCategory,
            isHidden: ch.isHidden,
          })),
        });
        // Server Action에서 redirect()가 호출되므로 여기서는 아무것도 할 필요 없음
      } catch (err) {
        console.error('Error saving channels:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStep('review');
      }
    });
  };

  // 카테고리 변경
  const handleCategoryChange = (channelId: string, newCategory: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.channelId === channelId
          ? { ...ch, category: newCategory, customCategory: newCategory }
          : ch
      )
    );
  };

  // 채널 숨김 토글
  const handleToggleHidden = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.channelId === channelId ? { ...ch, isHidden: !ch.isHidden } : ch
      )
    );
  };

  // 로딩 화면
  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">구독 채널 가져오는 중...</h2>
          <p className="text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 분류 중 화면
  if (step === 'classify') {
    const totalChannels = channels.length;
    const classifiedCount = channels.filter((ch) => ch.category && !ch.isClassifying).length;

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">AI가 채널을 분류하는 중...</h2>
          <p className="text-muted-foreground mb-4">
            {classifiedCount} / {totalChannels} 완료
          </p>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(classifiedCount / totalChannels) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 저장 중 화면
  if (step === 'saving') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">채널 저장 중...</h2>
          <p className="text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 검토 화면
  const groupedChannels = channels.reduce(
    (acc, channel) => {
      const category = channel.category || '기타';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(channel);
      return acc;
    },
    {} as Record<string, ChannelWithCategory[]>
  );

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">채널 선택 및 분류</h1>
        <p className="text-muted-foreground">
          AI가 자동으로 분류한 채널들을 확인하고 수정할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">
              {category} ({categoryChannels.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryChannels.map((channel) => (
                <Card
                  key={channel.channelId}
                  className={`p-4 ${channel.isHidden ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={channel.thumbnail}
                      alt={channel.title}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{channel.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {channel.description}
                      </p>

                      <div className="mt-2 flex gap-2">
                        <select
                          value={channel.category || '기타'}
                          onChange={(e) =>
                            handleCategoryChange(channel.channelId, e.target.value)
                          }
                          className="text-xs border rounded px-2 py-1"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleToggleHidden(channel.channelId)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {channel.isHidden ? '표시' : '숨김'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button variant="outline" onClick={fetchSubscriptions}>
          다시 불러오기
        </Button>
        <Button onClick={handleSave} size="lg">
          완료 ({channels.filter((ch) => !ch.isHidden).length}개 채널)
        </Button>
      </div>
    </div>
  );
}
