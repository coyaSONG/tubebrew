// AI service configuration

export const AI_CONFIG = {
  development: {
    provider: 'openrouter',
    models: {
      summary: 'google/gemini-flash-1.5-8b',
      classification: 'meta-llama/llama-3.2-3b',
    },
  },
  production: {
    provider: 'openai',
    models: {
      summaryBasic: 'gpt-4o-mini',
      summaryAdvanced: 'claude-sonnet-4',
    },
  },
} as const;
