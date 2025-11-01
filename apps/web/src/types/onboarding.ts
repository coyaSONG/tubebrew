/**
 * 온보딩 플로우에서 사용하는 타입 정의
 */

export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export interface ChannelWithCategory extends YouTubeChannel {
  category?: string;
  customCategory?: string;
  isHidden?: boolean;
  isClassifying?: boolean;
}

export const DEFAULT_CATEGORIES = [
  '개발/기술',
  '음악/엔터테인먼트',
  '뉴스/시사',
  '교육',
  '라이프스타일',
  '게임',
  '스포츠',
  '요리/푸드',
  '여행',
  '기타',
] as const;

export type CategoryType = (typeof DEFAULT_CATEGORIES)[number];

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}
