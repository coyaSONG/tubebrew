# TubeBrew - Product Requirements Document (PRD)

**버전**: 1.2
**작성일**: 2025년 11월 1일
**최종 수정**: 2025년 11월 1일
**작성자**: chsong
**문서 상태**: Draft (팩트 체크 반영)

---

## 1. Executive Summary

### 1.1 제품 개요
TubeBrew는 YouTube 구독 채널이 많은 사용자들이 새로 업로드되는 영상을 효율적으로 큐레이션하고 소비할 수 있도록 돕는 AI 기반 영상 요약 및 필터링 서비스입니다. 커피나 차를 우려내듯(Brewing) 영상의 핵심 내용만을 추출하여 제공합니다.

### 1.2 핵심 가치 제안
> "구독한 50개 채널, 하루 30개 영상 - 다 볼 시간 없죠?  
> TubeBrew가 AI로 핵심만 추출해드려요.  
> 3분 만에 오늘의 영상 스캔 완료."

---

## 2. 문제 정의

### 2.1 현재 문제점
- **정보 과부하**: 구독 채널이 수십 개가 되면 하루에도 수십 개의 새 영상 알림
- **시간 제약**: 모든 영상을 시청할 시간적 여유 없음
- **우선순위 결정 어려움**: 어떤 영상을 먼저 봐야 할지 판단하기 어려움
- **기회비용**: 중요한 영상을 놓치거나, 덜 중요한 영상에 시간 소비

### 2.2 타겟 사용자
**Primary Persona**: 
- 직장인 개발자/기술 종사자
- YouTube 구독 채널: 30개 이상
- 관심 분야: 개발, 기술, 뉴스, 음악/엔터 등 다양
- 하루 여유 시간: 30분 ~ 1시간
- 니즈: 핵심 정보만 빠르게 파악하고 싶음

---

## 3. 목표 및 성공 지표

### 3.1 비즈니스 목표
- **Phase 1 (MVP)**: 개인 사용 안정화 (1명, 3개월)
- **Phase 2 (Private Beta)**: 소규모 베타 테스트 (10-20명, 3개월)
- **Phase 3 (Public Launch)**: 공개 서비스 론칭

### 3.2 성공 지표 (Phase 1 기준)
- 일일 활성 사용 (7일 중 5일 이상)
- 영상 스캔 시간: 평균 5분 이내
- 시스템 안정성: 99% uptime
- 요약 정확도: 사용자 만족도 기준 (주관적 평가)

---

## 4. 핵심 기능 명세

### 4.1 사용자 인증 및 온보딩

#### 4.1.1 로그인 (P0 - Must Have)
- Google OAuth 2.0 인증
- YouTube Data API 권한 획득
  - `youtube.readonly`: 구독 채널 조회
  - `youtube.force-ssl`: 시청 기록 조회 (선택)

#### 4.1.2 채널 수집 및 분류 (P0)
**플로우**:
1. 사용자 구독 채널 자동 수집 (YouTube Data API)
2. AI 기반 자동 카테고리 분류
   - 채널명, 설명, 최근 영상 제목 분석
   - 카테고리: 개발/기술, 음악/엔터, 뉴스, 교육, 라이프스타일 등
3. 사용자 검토 및 수정 UI
   - 드래그 앤 드롭으로 카테고리 변경
   - 커스텀 카테고리 생성
   - 채널 숨김 기능

#### 4.1.3 초기 설정 (P0)
**요약 레벨 설정**:
- Level 1: 한 줄 요약 (20자 내외)
- Level 2: 3줄 요약 (기본값, 100-150자)
- Level 3: 챕터별 상세 요약 (타임스탬프 포함)
- Level 4: 전체 트랜스크립트 제공

**시청 기록 연동**:
- Option A: YouTube 시청 기록 동기화 (권장)
- Option B: TubeBrew 내에서만 추적

**알림 설정**:
- 실시간 푸시 알림
- 일일 다이제스트 (시간 설정 가능, 기본: 오전 8시)
- 주간 리포트
- 알림 끄기

---

### 4.2 영상 수집 및 처리

#### 4.2.1 신규 영상 감지 (P0)

**Phase 1 (MVP) 전략:**
**방법 1: RSS Feed** - Primary
- 채널 RSS 피드 체크 (`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`)
- 15분 간격 폴링
- 최신 15개 영상 조회 (충분)
- API 할당량 불필요
- 구현 간단, 디버깅 용이

**방법 2: YouTube Data API Polling** - Fallback
- RSS 실패 시 대체
- API 할당량 관리 필요

**Phase 2 이후:**
**방법 3: YouTube PubSubHubbub (WebSub)** - Real-time
- 채널별 webhook 구독
- 실시간 푸시 알림 수신 (<1분 지연)
- 서버 공개 URL 필요
- RSS와 병행 (redundancy)

#### 4.2.2 자막/트랜스크립트 획득 (P0)
**우선순위 전략**:
```
1. youtube-transcript-api로 자막 다운로드 (API 할당량 무관)
   ↓
2. 자막 있음?
   YES → 품질 검증 (기술 용어 정확도 체크)
     ├─ 품질 높음 → 사용
     └─ 품질 낮음 → 사용자 요청 시 재트랜스크립션
   NO → "자막 없음" 표시
   ↓
3. 사용자 명시적 요청 시 Whisper 트랜스크립션
   - 채널 카테고리 정보 활용
   - 자주 사용되는 전문 용어 프롬프팅
   - 비용 관리: 하루 5개 제한
```

**기술 세부사항**:
- **`youtube-transcript-api`** (Python 공식 라이브러리)
  - YouTube Data API 할당량 사용 안 함
  - 공개 자막만 접근 (ToS 준수)
  - **Node.js 환경**: Python 라이브러리를 child process로 실행하거나, `youtube-captions-scraper` 등 서드파티 npm 패키지 사용
  - 공식 라이브러리는 Python만 제공되므로 구현 전 Node.js 대안 검증 필요
- **Whisper API 사용 조건**:
  - 짧은 영상(<10분) 우선
  - 중요 채널 우선
  - 월 $10 예산 제한 (약 28시간 분량)

**컨텍스트 프롬프팅 예시**:
```
채널: Fireship (개발/기술)
예상 용어: JavaScript, TypeScript, React, API, Docker, Kubernetes
언어 패턴: 영어 위주, 기술 용어는 원문 유지
```

#### 4.2.3 AI 요약 생성 (P0)
**처리 파이프라인**:
```
트랜스크립트 → 채널 컨텍스트 추가 → LLM 요약 → 저장
```

**요약 프롬프트 구조**:
```
System: 
"당신은 YouTube 영상 요약 전문가입니다.
채널 카테고리: {category}
자주 등장하는 주제: {topics}
요약 레벨: {level}"

User:
"다음 영상을 요약해주세요:
제목: {title}
트랜스크립트: {transcript}"
```

**LLM 설정**:
- **개발 환경**: OpenRouter 무료 모델
  - `google/gemini-flash-1.5-8b`
  - `meta-llama/llama-3.2-3b`
  - **주의**: 무료 모델 목록은 변경될 수 있으므로 구현 전 확인 필요
- **프로덕션**: LiteLLM + OpenAI (권장)
  - **모든 레벨**: `gpt-4o-mini` (비용 효율, 품질 우수)
    - 가격: $0.15/1M input, $0.60/1M output
  - **대안 (고품질 필요 시)**: `claude-sonnet-4`
    - 가격: $3/1M input, $15/1M output (GPT-4o-mini 대비 20-25배)
    - 복잡한 기술 콘텐츠나 높은 정확도가 필수인 경우에만 선택적 사용
    - 비용 증가: 월 $1-2 → $8-20 예상

---

### 4.3 메인 대시보드

#### 4.3.1 홈 화면 (P0)
**레이아웃**:
```
┌─────────────────────────────────────┐
│  🎯 오늘의 새 영상                   │
│  24개 • 2025.11.01 오전 8시 기준     │
│                                     │
│  ⚡ 5분 안에 훑기 | 📖 상세히 보기   │
│  [탭] 전체  개발  음악  뉴스         │
│                                     │
│  📱 개발/기술 (12개)                │
│  ────────────────────────────────   │
│  [영상 카드 리스트]                  │
│                                     │
│  🎵 음악/엔터 (8개)                 │
│  📰 뉴스 (4개)                      │
└─────────────────────────────────────┘
```

**영상 카드 구성**:
- 썸네일 (클릭 → YouTube 이동)
- 제목
- 채널명, 영상 길이, 업로드 시간
- AI 요약 (설정된 레벨에 따라)
- 예상 시청/읽기 시간
- 액션 버튼: [영상 보기] [나중에] [✓본]

**필터링 옵션**:
- 카테고리별 탭
- 정렬: 최신순, 인기순, 추천순
- 영상 길이: 전체, 숏폼(<5분), 중간(5-20분), 긴 영상(20분+)

#### 4.3.2 빠른 스캔 모드 (P1 - Should Have)
- Level 1 요약만 표시 (한 줄)
- 무한 스크롤로 빠른 탐색
- 관심 있는 영상 탭하면 상세 보기

---

### 4.4 영상 상세 화면 (P0)

**포함 요소**:
- 영상 썸네일 (YouTube 링크)
- 메타 정보 (제목, 채널, 길이, 업로드 시간)
- AI 요약 (선택한 레벨)
- 챗터별 타임스탬프 (Level 3 이상)
- 전체 트랜스크립트 (Level 4)
- 액션: [YouTube에서 보기] [나중에 보기] [이미 봄 표시]

---

### 4.5 나중에 보기 (P0)

**기능**:
- 북마크된 영상 리스트
- 우선순위 표시 (⭐ 1-3개)
- 정렬: 최신순, 우선순위순, 영상 길이순
- 일괄 작업: YouTube 재생목록 추가, 모두 삭제
- 시청 완료 시 자동 제거 옵션

---

### 4.6 설정 (P0)

#### 4.6.1 계정 설정
- Google 계정 연동 해제
- 로그아웃
- 계정 삭제

#### 4.6.2 채널 관리
- 구독 채널 다시 불러오기
- 카테고리 편집
- 채널별 알림 설정
- 특정 채널 숨김

#### 4.6.3 요약 설정
- 기본 요약 레벨
- 채널별 개별 레벨 설정
- 언어 설정 (향후 다국어 지원 시)

#### 4.6.4 알림 설정
- 알림 타입 선택
- 시간 설정
- 푸시 알림 권한 관리

#### 4.6.5 시청 기록
- YouTube 연동 on/off
- 시청 기록 초기화
- 데이터 내보내기

---

### 4.7 추가 기능 (P2 - Nice to Have)

#### 4.7.1 통계 대시보드
- 이번 주 새 영상 수
- 시청 완료율
- 카테고리별 분포
- 가장 활발한 채널
- 누적 영상 수

#### 4.7.2 검색
- 영상 제목, 채널명 검색
- 요약 내용 전문 검색
- 필터: 기간, 카테고리, 시청 여부

#### 4.7.3 공유 기능 (Phase 2+)
- 친구에게 영상 추천
- 요약 공유 (링크 생성)

---

## 5. 기술 스택

### 5.1 프론트엔드
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**:
  - Server State: TanStack Query (React Query) - 캐싱, refetch, optimistic updates
  - Client State: Zustand - UI 상태, 필터, 토글
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

### 5.2 백엔드
- **Runtime**: Node.js 20+
- **API Framework**: Next.js API Routes + Fastify (Worker)
- **Language**: TypeScript
- **Job Queue**: BullMQ + Redis (Upstash)
- **Deployment**: Railway or Fly.io

### 5.3 데이터베이스
- **Primary DB**: Supabase (PostgreSQL)
- **Cache**: Redis (Upstash)
  - **무료 티어**: 256MB 스토리지, 500K commands/월
  - MVP 단계에 충분, 프로덕션 확장 시 모니터링 필요
  - **주의**: 2024-2025년 가격 정책 변경 있었으므로 배포 전 재확인 권장
- **Schema**:
  - `users`: 사용자 정보
  - `channels`: 구독 채널 정보
  - `videos`: 영상 메타데이터
  - `summaries`: AI 요약 결과
  - `bookmarks`: 나중에 보기
  - `watch_history`: 시청 기록
  - `user_settings`: 사용자 설정

### 5.4 외부 API 및 서비스
- **YouTube Data API v3**: 채널, 영상 정보
- **YouTube PubSubHubbub**: 실시간 알림
- **OpenAI Whisper API**: 음성 트랜스크립션
- **LiteLLM**: LLM 통합 레이어
  - Dev: OpenRouter (무료 모델)
  - Prod: OpenAI GPT-4o-mini, Claude Sonnet 4

### 5.5 모니터링 및 로깅
- **Application Monitoring**: Vercel Analytics
- **Error Tracking**: Sentry (선택, Phase 2+)
- **Logging**:
  - Development: console.log
  - Production: pino (structured JSON logging)
  - Log Storage: Railway Logs (7일) + Supabase Logs

### 5.6 데이터베이스 마이그레이션
- **도구**: Supabase Migrations (SQL 기반)
- **전략**:
  - 모든 스키마 변경은 migration 파일로 관리 (`packages/db/migrations/`)
  - 파일명 형식: `YYYYMMDDHHMMSS_description.sql`
  - 롤백 스크립트 작성 (down migration)
  - 프로덕션 배포 전 로컬/스테이징 DB에서 테스트
- **대안**: Drizzle ORM (TypeScript-first, 타입 안전성)

### 5.7 보안 전략
**인증 및 권한**:
- Google OAuth 2.0 (NextAuth.js)
- YouTube Token 자동 갱신 (Refresh Token)
- Supabase Row Level Security (RLS) 활성화

**API 보안**:
- Rate Limiting: Upstash Rate Limit (API Routes)
  - 사용자당 100 req/min
- CORS: Next.js API Routes는 same-origin (Webhook만 외부 허용)

**데이터 보호**:
- 환경 변수 암호화: Vercel Secrets, Railway Secrets
- YouTube API Key는 서버 사이드에서만 사용
- Refresh Token 암호화 저장 (Supabase Vault)

**보안 체크리스트**:
- [ ] .env 파일 gitignore 확인
- [ ] Supabase RLS 정책 설정
- [ ] API Rate Limiting 적용
- [ ] HTTPS 강제 (프로덕션)

### 5.8 에러 처리 전략
**프론트엔드**:
- React Error Boundary (전역 에러 캐치)
- Toast 알림: sonner 라이브러리
- Fallback UI 제공

**API Routes**:
- try-catch + structured error response
- 500 에러는 Sentry로 전송 (Phase 2+)

**Worker (BullMQ)**:
- 작업 실패 시 자동 재시도 (최대 3회)
- Exponential backoff (1분, 5분, 15분)
- 실패한 작업은 Dead Letter Queue (DLQ)로 이동
- DLQ 모니터링 (주간 리뷰)

**로깅 전략**:
```typescript
// 구조화된 로깅 예시
logger.info({
  event: 'video_processing',
  videoId: 'xxx',
  duration: 123,
  status: 'success'
});
```

### 5.9 프로젝트 구조
```
tubebrew/
├── apps/
│   ├── web/                    # Next.js 웹 앱
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx   # 메인 대시보드
│   │   │   │   ├── later/     # 나중에 보기
│   │   │   │   └── settings/  # 설정
│   │   │   └── api/
│   │   │       ├── webhooks/  # YouTube WebSub
│   │   │       └── ...
│   │   └── ...
│   └── worker/                 # 백그라운드 작업 서버
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── video-processor.ts
│       │   │   ├── summarizer.ts
│       │   │   └── notification.ts
│       │   └── index.ts
│       └── ...
├── packages/
│   ├── db/                     # Supabase 스키마, 타입
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   └── types.ts
│   ├── youtube/                # YouTube API 래퍼
│   │   ├── api.ts
│   │   ├── webhooks.ts
│   │   └── types.ts
│   ├── ai/                     # AI 통합
│   │   ├── summarizer.ts
│   │   ├── transcriber.ts
│   │   ├── classifier.ts
│   │   └── config.ts
│   └── types/                  # 공유 타입
│       └── index.ts
├── package.json                # Workspace root
└── turbo.json                  # Turborepo 설정
```

---

## 6. 데이터베이스 스키마

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  youtube_channel_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary_level INTEGER DEFAULT 2 CHECK (summary_level BETWEEN 1 AND 4),
  notification_type VARCHAR(50) DEFAULT 'daily',
  notification_time TIME DEFAULT '08:00:00',
  youtube_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Channels
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(100),
  subscriber_count BIGINT,
  video_count BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Channels (구독 관계)
CREATE TABLE user_channels (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  custom_category VARCHAR(100),
  is_hidden BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  custom_summary_level INTEGER CHECK (custom_summary_level BETWEEN 1 AND 4),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(255) UNIQUE NOT NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- seconds
  published_at TIMESTAMP NOT NULL,
  view_count BIGINT,
  like_count BIGINT,
  has_captions BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transcripts
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  source VARCHAR(50), -- 'youtube', 'whisper'
  language VARCHAR(10),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Summaries
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  level INTEGER CHECK (level BETWEEN 1 AND 4),
  content TEXT NOT NULL,
  model VARCHAR(100), -- 'gpt-4o-mini', 'claude-sonnet-4'
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookmarks (나중에 보기)
CREATE TABLE bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- Watch History
CREATE TABLE watch_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50), -- 'tubebrew', 'youtube'
  PRIMARY KEY (user_id, video_id)
);

-- Indexes
CREATE INDEX idx_videos_channel_published ON videos(channel_id, published_at DESC);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_user_channels_user ON user_channels(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_watch_history_user ON watch_history(user_id, watched_at DESC);
```

---

## 7. 사용자 플로우

### 7.1 첫 방문 사용자 (온보딩)
```
랜딩 페이지
  ↓
Google 로그인
  ↓
YouTube 권한 승인
  ↓
구독 채널 수집 (로딩)
  ↓
AI 자동 분류 결과 표시
  ↓
사용자 검토 및 수정
  ↓
초기 설정 (요약 레벨, 알림 등)
  ↓
대시보드 진입
```

### 7.2 일상적 사용
```
앱 열기 / 알림 탭
  ↓
메인 대시보드 (새 영상 리스트)
  ↓
카테고리별 탭 / 요약 스캔
  ↓
관심 영상 → 상세 보기
  ↓
액션 선택:
├─ YouTube에서 보기 (시청 기록 저장)
├─ 나중에 보기 (북마크)
└─ 이미 봄 표시
```

### 7.3 백그라운드 처리
```
새 영상 업로드 (YouTube)
  ↓
WebSub 푸시 알림
  ↓
작업 큐에 추가
  ↓
병렬 처리:
├─ 채널/카테고리 확인
├─ 자막 수집 or 트랜스크립션
└─ AI 요약 생성 (4가지 레벨)
  ↓
DB 저장
  ↓
사용자에게 표시 준비 완료
  ↓
(알림 시간 도래 시) 푸시 알림 발송
```

---

## 8. 개발 로드맵

### Phase 1: MVP 개발 (8-12주)

#### Week 1-2: 프로젝트 셋업
- [ ] 프로젝트 구조 생성 (Monorepo)
- [ ] Next.js 앱 초기화
- [ ] Supabase 프로젝트 생성
- [ ] DB 스키마 설계 및 마이그레이션
- [ ] Google OAuth 설정

#### Week 3-4: 인증 및 온보딩
- [ ] Google 로그인 구현
- [ ] YouTube Data API 연동
- [ ] 구독 채널 수집 기능
- [ ] AI 기반 채널 분류 (LiteLLM + OpenRouter)
- [ ] 카테고리 편집 UI

#### Week 5-6: 영상 수집 파이프라인
- [ ] RSS 피드 폴링 구현 (시작점)
- [ ] YouTube API로 자막 수집
- [ ] Whisper API 트랜스크립션 (백업)
- [ ] Worker 서버 구축 (Railway)
- [ ] BullMQ 작업 큐 설정

#### Week 7-8: AI 요약
- [ ] LiteLLM 통합
- [ ] OpenRouter 무료 모델 설정
- [ ] 요약 프롬프트 최적화
- [ ] 4가지 레벨 요약 생성
- [ ] 요약 캐싱 로직

#### Week 9-10: 프론트엔드 UI
- [ ] 메인 대시보드 레이아웃
- [ ] 영상 카드 컴포넌트
- [ ] 카테고리 탭 필터링
- [ ] 영상 상세 모달
- [ ] 나중에 보기 페이지
- [ ] 설정 페이지

#### Week 11-12: 테스트 및 개선
- [ ] 통합 테스트 작성 (YouTube API, Supabase)
- [ ] 실제 데이터로 플로우 검증
- [ ] 버그 수정
- [ ] 성능 최적화 (DB 쿼리, 캐싱)
- [ ] 문서화 (README, 환경 설정 가이드)
- [ ] MVP 배포

#### 테스트 전략 (Phase 1)
**우선순위 1: 통합 테스트**
```typescript
// YouTube API 연동 테스트
test('should fetch user subscriptions', async () => {
  const channels = await youtube.getSubscriptions(userId);
  expect(channels.length).toBeGreaterThan(0);
});

// Supabase 쿼리 테스트
test('should save video to database', async () => {
  const video = await db.videos.insert({ ... });
  expect(video.id).toBeDefined();
});
```

**우선순위 2: 수동 테스트**
- [ ] 로그인 → 채널 수집 → 분류
- [ ] 영상 수집 → 자막 다운로드 → AI 요약
- [ ] 대시보드 필터링, 정렬
- [ ] 나중에 보기 기능

**우선순위 3 (Phase 2+): E2E 테스트**
- Playwright로 Critical Path 테스트
- 로그인 → 영상 리스트 → 상세 보기

**도구**:
- Jest (통합 테스트)
- Supabase Local Dev (로컬 DB)
- Playwright (E2E, Phase 2+)

---

### Phase 2: 기능 확장 (8주)

#### Week 1-2: WebSub 실시간 알림
- [ ] PubSubHubbub 구현
- [ ] Webhook 엔드포인트
- [ ] 실시간 알림 처리

#### Week 3-4: 고급 기능
- [ ] 검색 기능
- [ ] 통계 대시보드
- [ ] 빠른 스캔 모드
- [ ] 시청 기록 YouTube 연동

#### Week 5-6: 모바일 최적화
- [ ] 반응형 UI 개선
- [ ] PWA 지원
- [ ] 푸시 알림 (웹/모바일)

#### Week 7-8: 안정화
- [ ] 모니터링 설정
- [ ] 에러 추적
- [ ] 성능 개선
- [ ] 베타 테스터 초대 (10-20명)

---

### Phase 3: 공개 준비 (TBD)
- [ ] 프로덕션 LLM 전환 (OpenAI API)
- [ ] 비용 최적화
- [ ] 커스텀 도메인 연결
- [ ] 로고 및 브랜딩
- [ ] 랜딩 페이지 개선
- [ ] 회원가입 오픈
- [ ] 무료/프로 플랜 설계
- [ ] 결제 시스템 (Stripe)

---

## 9. 비용 추정

### Phase 1 (MVP - 개발 단계)
**월 예상 비용: $0-5**

| 항목 | 비용 | 비고 |
|------|------|------|
| Vercel | $0 | Hobby 플랜 |
| Supabase | $0 | 무료 티어 (500MB DB) |
| Railway | $5 | Hobby 플랜 (Worker) |
| Upstash Redis | $0 | 무료 티어 |
| OpenRouter LLM | $0 | 무료 모델 사용 |
| YouTube API | $0 | 무료 할당량 |
| **합계** | **$5** | |

### Phase 2 (Private Beta)
**월 예상 비용: $10-20**
- Railway: $10-15 (확장)
- OpenRouter: $0-5 (일부 유료 모델 테스트)

### Phase 3 (프로덕션)
**월 예상 비용: $7-15** (재계산)

**사용량 가정**:
- 활성 사용자: 1명
- 구독 채널: 50개
- 일일 새 영상: 30개
- 월 처리 영상: ~900개

**상세 비용 계산**:

**LLM 비용 (GPT-4o-mini)**:
```
가정:
- 영상 평균 길이: 15분
- 트랜스크립트: ~3,000 tokens/영상
- 요약 출력: ~200 tokens/영상
- Level 1-2만 자동 생성 (Level 3-4는 요청 시)

계산:
- Input: 30영상 × 3,000 tokens × 30일 = 2.7M tokens/월
  → $0.15/1M × 2.7 = $0.41
- Output: 30영상 × 200 tokens × 30일 = 180K tokens/월
  → $0.60/1M × 0.18 = $0.11

총 LLM 비용: ~$0.52/월
(Level 3-4 포함 시 × 2 = ~$1/월)
```

**Whisper API 비용**:
```
전략: 사용자 요청 시에만 실행
- 월 5개 영상만 트랜스크립션
- 5영상 × 15분 × $0.006/분 = $0.45/월
```

| 항목 | 월 비용 | 비고 |
|------|---------|------|
| Railway | $5-10 | Worker 서버 (Hobby → Starter) |
| Supabase | $0 | 무료 티어 충분 (500MB DB) |
| Upstash Redis | $0 | 무료 티어 충분 (256MB, 500K commands) |
| OpenAI API (LLM) | $1-2 | GPT-4o-mini (권장) |
| Whisper API | $0-1 | 선택적 사용만 |
| Vercel | $0 | Hobby 충분 |
| **합계** | **$6-13** | **예상보다 저렴** |

**⚠️ Claude Sonnet 4 사용 시 비용 증가**:
```
동일 사용량으로 Claude Sonnet 4 사용 시:
- Input: 2.7M tokens × $3/1M = $8.10
- Output: 180K tokens × $15/1M = $2.70
- 총 LLM 비용: ~$10.80/월 (GPT-4o-mini의 20배)

전체 월 비용: $15-23 (GPT-4o-mini 대비 $9-10 증가)
```

**권장사항**:
- 기본은 GPT-4o-mini 사용 ($6-13/월)
- Claude는 고품질이 필수인 특정 콘텐츠에만 선택적 사용
- 혼합 사용 시 예상 비용: $8-18/월

**비용 최적화 전략**:
- ✅ YouTube 자막 우선 (youtube-transcript-api, 할당량 무관)
- ✅ Level 1-2만 자동 생성 (요약 캐싱)
- ✅ Whisper는 사용자 요청 시에만 (월 예산 $1 제한)
- ✅ GPT-4o-mini 사용 (GPT-4 대비 1/15 가격)
- ✅ Redis 캐싱으로 중복 LLM 호출 방지

---

## 10. 리스크 및 제약사항

### 10.1 기술적 리스크
| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| YouTube API 할당량 초과 | 높음 | WebSub 사용, RSS 백업, 캐싱 |
| AI 요약 품질 저하 | 중간 | 프롬프트 최적화, 모델 선택 유연성 (LiteLLM) |
| 트랜스크립션 비용 증가 | 중간 | YouTube 자막 우선, Whisper 선택적 사용 |
| 서버 다운타임 | 중간 | Railway auto-restart, 모니터링 |

### 10.2 제품 리스크
| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 요약이 부정확함 | 높음 | 사용자 피드백 수집, 프롬프트 개선 |
| 사용자가 실제로 사용하지 않음 | 높음 | MVP 단계에서 본인이 직접 사용, 페인포인트 검증 |
| YouTube ToS 위반 | 낮음 | 공식 API만 사용, 크롤링 금지 |

### 10.3 비즈니스 리스크
| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 비용 증가로 인한 지속 불가능 | 중간 | Phase별 비용 모니터링, 최적화 |
| 경쟁 서비스 출현 | 낮음 | 개인 프로젝트로 학습 목적 우선 |

### 10.4 제약사항
- **초기 사용자**: 어드민 계정(본인)만 접근 가능
- **YouTube API 할당량**: 일일 10,000 units (채널 50개 기준 충분)
- **LLM 비용**: 초기엔 무료 모델, 나중에 유료 전환
- **서버 리소스**: Railway Hobby 플랜 제한
- **시간**: 개인 프로젝트로 주말/저녁 시간 활용

---

## 11. 미래 확장 계획 (Phase 3+)

### 11.1 추가 기능
- **다국어 지원**: 한국어, 영어, 일본어 등
- **팀/가족 공유**: 여러 사용자가 함께 사용
- **AI 챗봇**: 영상 내용에 대해 질문/대화
- **요약 커스터마이징**: 사용자가 원하는 형식 지정
- **Podcast 지원**: YouTube 외 다른 플랫폼

### 11.2 수익화 (선택사항)
- **무료 플랜**: 10개 채널, 기본 요약
- **프로 플랜**: $5-10/월
  - 무제한 채널
  - 고급 필터링
  - 상세 요약
  - 우선 처리

### 11.3 통합
- **Notion**: 요약을 Notion 페이지로 자동 저장
- **Obsidian**: 개인 지식 베이스 연동
- **Slack/Discord**: 팀 채널에 요약 공유

---

## 12. 성공 지표 (KPI)

### Phase 1 (MVP)
- **일일 활성 사용**: 7일 중 5일 이상
- **영상 스캔 시간**: 평균 5분 이내
- **시스템 안정성**: 99% uptime
- **요약 만족도**: 주관적 평가 "만족" 이상

### Phase 2 (Private Beta)
- **사용자 유지율**: 월 80% 이상
- **평균 세션 시간**: 10분 이상
- **나중에 보기 활용률**: 사용자당 주 5개 이상
- **시청 전환율**: 요약 본 영상 중 30% 이상 실제 시청

### Phase 3 (Public)
- **가입자 수**: 100명 (첫 3개월)
- **DAU/MAU**: 0.4 이상
- **비용 효율**: 사용자당 $2 이하
- **NPS**: 40 이상

---

## 13. 의사결정 로그

| 날짜 | 결정 사항 | 이유 |
|------|-----------|------|
| 2025-11-01 | LiteLLM 사용 | 프로바이더 유연성, fallback 지원 |
| 2025-11-01 | 개발 단계 OpenRouter 무료 모델 | 초기 비용 0원, 테스트 용이 |
| 2025-11-01 | MVP는 어드민만 접근 | 안정화 후 공개, 리스크 최소화 |
| 2025-11-01 | Vercel 무료 서브도메인 사용 | 초기 비용 절감, 커스텀 도메인은 나중에 |
| 2025-11-01 | YouTube 자막 우선 전략 | 비용 효율, Whisper는 백업 |
| 2025-11-01 (v1.1) | youtube-transcript-api 사용 | API 할당량 절약, 크롤링 아닌 공개 API |
| 2025-11-01 (v1.1) | Phase 1에서 RSS Feed Primary | WebSub보다 구현 간단, 디버깅 용이 |
| 2025-11-01 (v1.1) | TanStack Query + Zustand | 서버/클라이언트 상태 명확히 분리 |
| 2025-11-01 (v1.1) | Whisper 사용자 요청 시에만 | 비용 관리 (~$1/월), 자막 우선 |
| 2025-11-01 (v1.1) | Supabase Migrations | SQL 기반, 롤백 가능, 프로덕션 안정성 |
| 2025-11-01 (v1.2) | GPT-4o-mini를 주력 LLM으로 결정 | Claude 대비 20배 저렴, 품질도 우수 |
| 2025-11-01 (v1.2) | Claude는 선택적 사용만 | 복잡한 기술 콘텐츠 등 고품질 필요 시에만 |
| 2025-11-01 (v1.2) | Upstash 무료 티어 제한 명시 | 256MB, 500K commands/월, 가격 변동 모니터링 |
| 2025-11-01 (v1.2) | youtube-transcript-api Python 우선 | Node.js는 서드파티, 공식은 Python만 제공 |

---

## 14. 부록

### 14.1 참고 자료
- YouTube Data API: https://developers.google.com/youtube/v3
- PubSubHubbub: https://github.com/pubsubhubbub/PubSubHubbub
- LiteLLM Docs: https://docs.litellm.ai/
- OpenRouter: https://openrouter.ai/
- Supabase: https://supabase.com/docs

### 14.2 용어 정의
- **요약 레벨**: AI가 생성하는 요약의 상세도 (1-4단계)
- **WebSub**: 실시간 푸시 알림 프로토콜
- **트랜스크립트**: 영상의 음성을 텍스트로 변환한 것
- **큐레이션**: 수많은 영상 중 중요한 것을 선별하는 행위

### 14.3 연락처
- **Product Owner**: chsong
- **개발자**: chsong

---

**문서 변경 이력**:
- v1.0 (2025-11-01): 초안 작성
- v1.1 (2025-11-01): 개선사항 반영
  - 자막 수집: youtube-transcript-api 추가
  - 영상 감지: Phase 1에서 RSS Feed Primary로 변경
  - 상태 관리: TanStack Query + Zustand 명확화
  - 보안 전략 섹션 추가 (5.7)
  - 에러 처리 전략 추가 (5.8)
  - DB 마이그레이션 전략 추가 (5.6)
  - 테스트 전략 구체화 (Week 11-12)
  - 비용 재계산 ($6-13/월)
- v1.2 (2025-11-01): 팩트 체크 반영
  - LLM 전략: GPT-4o-mini 주력 사용, Claude는 선택적 사용으로 명확화 (4.2.3)
  - Claude Sonnet 4 가격 정보 추가 ($3/$15 per 1M tokens, GPT-4o-mini 대비 20배)
  - youtube-transcript-api: Python 공식, Node.js는 서드파티 명시 (4.2.2)
  - Upstash Redis 무료 티어 제한 추가 (256MB, 500K commands/월) (5.3)
  - OpenRouter 무료 모델 가용성 주의사항 추가 (4.2.3)
  - Claude 사용 시 비용 증가 분석 추가 ($15-23/월) (9)
  - 의사결정 로그 업데이트 (13)
