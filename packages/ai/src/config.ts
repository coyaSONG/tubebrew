// AI service configuration

export const AI_CONFIG = {
  // OpenRouter (Development & Production - Free Tier)
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    // Primary model: Best free model for text classification (Nov 2025)
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    // Fallback models in order of preference
    fallbackModels: [
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'google/gemini-2.5-pro-exp-03-25:free', // High performance but experimental
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

  // Default categories (optimized for Korean YouTube market 2025)
  categories: [
    '개발/기술',         // Tech & Development
    '게임',              // Gaming
    '음악/K-pop',        // Music & K-pop
    '엔터테인먼트/예능',  // Entertainment & Variety
    '뷰티/패션',         // Beauty & Fashion
    '금융/재테크',       // Finance & Investment
    '교육',              // Education
    '푸드/먹방',         // Food & Mukbang
    '동물/펫',           // Pets & Animals
    '스포츠',            // Sports
    '건강/운동',         // Health & Fitness
    '라이프스타일/Vlog', // Lifestyle & Vlog
    '뉴스/시사',         // News & Current Affairs
    '여행',              // Travel
    '기타',              // Others
  ],
} as const;

export type SummaryLevel = 1 | 2 | 3 | 4;
export type ChannelCategory = typeof AI_CONFIG.categories[number];
