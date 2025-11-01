// AI service configuration

export const AI_CONFIG = {
  // OpenRouter (Development)
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    freeModels: [
      'google/gemini-flash-1.5-8b',
      'meta-llama/llama-3.2-3b-instruct:free',
    ],
  },

  // OpenAI (Production)
  openai: {
    models: {
      summary: 'gpt-4o-mini',
      classification: 'gpt-4o-mini',
      transcription: 'whisper-1',
    },
    pricing: {
      'gpt-4o-mini': {
        input: 0.15 / 1_000_000, // $0.15 per 1M tokens
        output: 0.6 / 1_000_000, // $0.60 per 1M tokens
      },
      'whisper-1': 0.006 / 60, // $0.006 per minute
    },
  },

  // Summary levels
  summaryLevels: {
    1: {
      name: '한 줄 요약',
      maxChars: 20,
      maxTokens: 50,
    },
    2: {
      name: '3줄 요약',
      maxChars: 150,
      maxTokens: 200,
    },
    3: {
      name: '챕터별 상세 요약',
      maxChars: 1000,
      maxTokens: 800,
    },
    4: {
      name: '전체 트랜스크립트',
      maxChars: 10000,
      maxTokens: 2000,
    },
  },

  // Default categories
  categories: [
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
  ],
} as const;

export type SummaryLevel = 1 | 2 | 3 | 4;
export type ChannelCategory = typeof AI_CONFIG.categories[number];
