/**
 * 온보딩 플로우에서 사용하는 타입 정의
 */

import { AI_CONFIG } from '@tubebrew/ai';

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

// Use AI_CONFIG.categories as the single source of truth
export const DEFAULT_CATEGORIES = AI_CONFIG.categories;

export type CategoryType = (typeof AI_CONFIG.categories)[number];

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}
