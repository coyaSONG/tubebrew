import OpenAI from 'openai';

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
    // Support OpenRouter or OpenAI
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      baseURL: baseURL || process.env.OPENROUTER_BASE_URL,
    });

    // Default to GPT-4o-mini for production, or free models for dev
    this.model = model || process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  /**
   * Transcribe audio from video (using Whisper API)
   * Only use when YouTube captions are not available
   */
  async transcribeVideo(audioFile: File | Blob): Promise<string> {
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
   * Supports 4 levels of detail
   */
  async generateSummary(
    videoTitle: string,
    transcript: string,
    options: SummaryOptions
  ): Promise<Summary> {
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildUserPrompt(videoTitle, transcript, options.level);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: this.getMaxTokens(options.level),
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      return {
        level: options.level,
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * Classify channel into categories based on channel info
   */
  async classifyChannel(
    channelTitle: string,
    channelDescription: string,
    recentVideoTitles: string[]
  ): Promise<string> {
    const systemPrompt = `당신은 YouTube 채널을 카테고리로 분류하는 전문가입니다.
다음 카테고리 중 하나로 분류해주세요:
- 개발/기술
- 음악/엔터테인먼트
- 뉴스/시사
- 교육
- 라이프스타일
- 게임
- 스포츠
- 요리/푸드
- 여행
- 기타

채널명, 설명, 최근 영상 제목을 분석하여 가장 적합한 카테고리 하나만 답변해주세요.`;

    const userPrompt = `채널명: ${channelTitle}

채널 설명: ${channelDescription}

최근 영상 제목:
${recentVideoTitles.slice(0, 5).map((title, i) => `${i + 1}. ${title}`).join('\n')}

카테고리:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 50,
      });

      return response.choices[0]?.message?.content?.trim() || '기타';
    } catch (error) {
      console.error('Error classifying channel:', error);
      return '기타';
    }
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
