import OpenAI from 'openai';
import { AI_CONFIG } from './config';

export interface SummaryOptions {
  level: 1 | 2 | 3 | 4;
  channelCategory?: string;
  channelTopics?: string[];
}

export interface Summary {
  level: number;
  content: string;
  tokensUsed: number;
  model: string;
}

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export class AIService {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string, baseURL?: string, model?: string) {
    // Prioritize OpenRouter for free tier
    const apiKeyToUse =
      apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseURLToUse =
      baseURL ||
      process.env.OPENROUTER_BASE_URL ||
      AI_CONFIG.openrouter.baseURL;

    this.openai = new OpenAI({
      apiKey: apiKeyToUse,
      baseURL: baseURLToUse,
    });

    // Default to best free model from OpenRouter
    this.model =
      model ||
      process.env.LLM_MODEL ||
      AI_CONFIG.openrouter.defaultModel ||
      'gpt-4o-mini';

    console.log(`[AIService] Using model: ${this.model}`);
    console.log(`[AIService] Base URL: ${baseURLToUse}`);
  }

  /**
   * Transcribe audio from video (using Whisper API)
   * Only use when YouTube captions are not available
   */
  async transcribeVideo(audioFile: File): Promise<string> {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'ko', // or detect automatically
      });

      return response.text;
    } catch (error) {
      console.error('Error transcribing video:', error);
      throw new Error('Failed to transcribe video');
    }
  }

  /**
   * Generate AI summary of video transcript
   * Supports 4 levels of detail with automatic fallback
   */
  async generateSummary(
    videoTitle: string,
    transcript: string,
    options: SummaryOptions
  ): Promise<Summary> {
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildUserPrompt(
      videoTitle,
      transcript,
      options.level
    );

    // Try with primary model first, then fallback models
    const modelsToTry = [this.model, ...AI_CONFIG.openrouter.fallbackModels];

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        console.log(
          `[AIService] Attempting summary with model: ${currentModel}`
        );

        const response = await this.openai.chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: this.getMaxTokens(options.level),
        });

        const content = response.choices[0]?.message?.content || '';
        const tokensUsed = response.usage?.total_tokens || 0;

        console.log(
          `[AIService] Successfully generated summary with ${currentModel}`
        );

        return {
          level: options.level,
          content,
          tokensUsed,
          model: currentModel,
        };
      } catch (error) {
        console.error(
          `[AIService] Error with model ${currentModel}:`,
          error instanceof Error ? error.message : error
        );

        // If this was the last model, throw error
        if (i === modelsToTry.length - 1) {
          console.error('[AIService] All models failed for summary');
          throw new Error('Failed to generate summary with all available models');
        }

        // Otherwise, try next model
        console.log('[AIService] Trying next fallback model...');
      }
    }

    throw new Error('Failed to generate summary');
  }

  /**
   * Classify channel into categories based on channel info
   * Includes automatic fallback to alternative models if primary fails
   */
  async classifyChannel(
    channelTitle: string,
    channelDescription: string,
    recentVideoTitles: string[]
  ): Promise<string> {
    const systemPrompt = `당신은 YouTube 채널을 카테고리로 분류하는 전문가입니다.
다음 카테고리 중 하나로 분류해주세요:

- 개발/기술: 프로그래밍, 코딩, 소프트웨어, IT, 개발 튜토리얼
- 게임: 게임 플레이, 게임 리뷰, e-스포츠, 게임 방송
- 음악/K-pop: 음악 영상, K-pop 아이돌, 뮤직비디오, 음악 커버
- 엔터테인먼트/예능: 버라이어티, 토크쇼, 코미디, 예능 프로그램
- 뷰티/패션: 메이크업, 스킨케어, 패션, 뷰티 제품 리뷰
- 금융/재테크: 주식, 투자, 부동산, 경제, 재테크 정보
- 교육: 강의, 학습, 지식 공유, 교육 콘텐츠
- 푸드/먹방: 요리, 먹방, 레시피, 맛집 소개
- 동물/펫: 반려동물, 강아지, 고양이, 동물 일상
- 스포츠: 운동, 스포츠 경기, 선수, 스포츠 뉴스
- 건강/운동: 피트니스, 운동 루틴, 건강 정보, 다이어트
- 라이프스타일/Vlog: 일상 브이로그, 라이프스타일, 일상 공유
- 뉴스/시사: 뉴스, 시사, 정치, 사회 이슈
- 여행: 여행 브이로그, 여행 정보, 관광지 소개
- 기타: 위 카테고리에 속하지 않는 채널

채널명, 설명, 최근 영상 제목을 종합적으로 분석하여 가장 적합한 카테고리 하나만 정확히 답변해주세요.
카테고리명만 답변하고 다른 설명은 추가하지 마세요.`;

    const userPrompt = `채널명: ${channelTitle}

채널 설명: ${channelDescription}

최근 영상 제목:
${recentVideoTitles.slice(0, 5).map((title, i) => `${i + 1}. ${title}`).join('\n')}

카테고리:`;

    // Try with primary model first, then fallback models
    const modelsToTry = [this.model, ...AI_CONFIG.openrouter.fallbackModels];

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        console.log(
          `[AIService] Attempting classification with model: ${currentModel}`
        );

        const response = await this.openai.chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 50,
        });

        const category = response.choices[0]?.message?.content?.trim();
        if (category) {
          console.log(
            `[AIService] Successfully classified with ${currentModel}: ${category}`
          );
          return category;
        }
      } catch (error) {
        console.error(
          `[AIService] Error with model ${currentModel}:`,
          error instanceof Error ? error.message : error
        );

        // If this was the last model, return default
        if (i === modelsToTry.length - 1) {
          console.error('[AIService] All models failed, returning default');
          return '기타';
        }

        // Otherwise, try next model
        console.log('[AIService] Trying next fallback model...');
      }
    }

    return '기타';
  }

  /**
   * Build system prompt based on options
   */
  private buildSystemPrompt(options: SummaryOptions): string {
    let prompt = `당신은 YouTube 영상 요약 전문가입니다.
사용자가 바쁜 시간 내에 영상의 핵심 내용을 파악할 수 있도록 명확하고 간결하게 요약해주세요.`;

    if (options.channelCategory) {
      prompt += `\n\n채널 카테고리: ${options.channelCategory}`;
    }

    if (options.channelTopics && options.channelTopics.length > 0) {
      prompt += `\n자주 등장하는 주제: ${options.channelTopics.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Build user prompt based on level
   */
  private buildUserPrompt(
    videoTitle: string,
    transcript: string,
    level: number
  ): string {
    const levelInstructions = {
      1: '한 줄(20자 이내)로 핵심만 요약해주세요.',
      2: '3줄 정도(100-150자)로 요약해주세요. 주요 내용과 핵심 메시지를 포함해주세요.',
      3: '챕터별로 상세히 요약해주세요. 각 챕터마다 제목과 핵심 내용을 작성하고, 가능하면 타임스탬프를 추정해주세요.',
      4: '전체 트랜스크립트를 정리하여 제공해주세요. 문단을 나누고 가독성을 높여주세요.',
    };

    return `영상 제목: ${videoTitle}

트랜스크립트:
${transcript}

${levelInstructions[level as keyof typeof levelInstructions]}`;
  }

  /**
   * Get max tokens based on summary level
   */
  private getMaxTokens(level: number): number {
    const tokenLimits = {
      1: 50,
      2: 200,
      3: 800,
      4: 2000,
    };

    return tokenLimits[level as keyof typeof tokenLimits] || 200;
  }
}

export * from './config';
