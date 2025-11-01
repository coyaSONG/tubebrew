# TubeBrew

> YouTube 구독 채널의 새 영상을 AI로 요약하는 서비스

## 📋 개요

TubeBrew는 YouTube 구독 채널이 많은 사용자들이 새로 업로드되는 영상을 효율적으로 큐레이션하고 소비할 수 있도록 돕는 AI 기반 영상 요약 및 필터링 서비스입니다.

**핵심 가치 제안:**
> "구독한 50개 채널, 하루 30개 영상 - 다 볼 시간 없죠?
> TubeBrew가 AI로 핵심만 추출해드려요.
> 3분 만에 오늘의 영상 스캔 완료."

## 🏗️ 프로젝트 구조

이 프로젝트는 Turborepo를 사용하는 monorepo입니다:

```
tubebrew/
├── apps/
│   ├── web/                    # Next.js 웹 앱
│   └── worker/                 # 백그라운드 작업 서버 (Fastify + BullMQ)
├── packages/
│   ├── db/                     # Supabase 클라이언트 및 스키마
│   │   ├── migrations/         # DB 마이그레이션 파일
│   │   └── src/                # DB 유틸리티
│   ├── youtube/                # YouTube API + Transcript
│   ├── ai/                     # AI 통합 (LiteLLM)
│   └── types/                  # 공유 TypeScript 타입
```

## 🚀 기술 스택

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**:
  - Server State: TanStack Query (React Query)
  - Client State: Zustand
- **Toast**: Sonner

### Backend
- **Web API**: Next.js API Routes
- **Worker**: Fastify + BullMQ
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (Upstash)
- **Auth**: Supabase Auth + Google OAuth (YouTube API scopes)
- **Logging**: Pino (structured logging)

### AI & External Services
- **LLM**: OpenRouter (무료 Tier 사용)
  - Primary: **Llama 3.3 70B Instruct** (무료, 최고 성능)
  - Fallback: Mistral Small 3.1, DeepSeek V3, Gemini 2.5 Pro Exp
  - Optional: OpenAI GPT-4o-mini (유료 대안)
- **Transcription**:
  - Primary: youtube-transcript (무료)
  - Fallback: OpenAI Whisper API
- **YouTube**:
  - Phase 1: RSS Feed + YouTube Data API
  - Phase 2+: PubSubHubbub (WebSub)

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 20+
- pnpm 9+ (설치: `npm install -g pnpm` 또는 `brew install pnpm`)

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd tubebrew

# 의존성 설치
pnpm install
```

### 환경 변수 설정

```bash
# 루트 디렉토리에 .env.local 생성
cp .env.example .env.local
```

필요한 환경 변수를 `.env.local` 파일에 입력하세요:

1. **Supabase** (데이터베이스)
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon/Public 키
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role 키

2. **App 설정**
   - `NEXT_PUBLIC_APP_URL`: http://localhost:3000 (개발 환경)

3. **YouTube Data API**
   - `YOUTUBE_API_KEY`: Google Cloud Console에서 발급

4. **AI 서비스** (OpenRouter 무료 Tier 권장)
   - `OPENROUTER_API_KEY`: [OpenRouter](https://openrouter.ai)에서 무료 발급
   - `OPENROUTER_BASE_URL`: https://openrouter.ai/api/v1
   - `LLM_MODEL`: meta-llama/llama-3.3-70b-instruct:free (기본값)
   - (선택) `OPENAI_API_KEY`: 유료 대안 사용 시

5. **Redis** (캐싱 & 작업 큐)
   - `REDIS_URL`: Upstash Redis URL

### Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 에서 새 프로젝트 생성
2. SQL Editor에서 마이그레이션 실행:
   ```bash
   # packages/db/migrations/20251101000001_initial_schema.sql 파일 내용을 복사해서 실행
   ```
3. Settings > API에서 URL과 키를 복사하여 .env.local에 추가

### Google OAuth 설정 (Supabase)

1. [Google Cloud Console](https://console.cloud.google.com) 에서 프로젝트 생성
2. "APIs & Services" > "OAuth consent screen" 설정
   - User Type: External 선택
   - Scopes 추가:
     - `openid`, `email`, `profile`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
3. "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
4. Supabase Dashboard > Authentication > Providers > Google
   - Client ID와 Client Secret 입력
   - "Enabled" 체크

### YouTube API 설정

1. Google Cloud Console > "APIs & Services" > "Library"
2. "YouTube Data API v3" 검색 후 활성화
3. "Credentials" > "Create Credentials" > "API Key"
4. API 키를 .env.local에 추가

### 개발 서버 실행

```bash
# 모든 앱을 동시에 실행 (Turborepo)
pnpm dev

# 또는 개별 실행
cd apps/web
pnpm dev
```

웹 앱은 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 🗂️ 개발 로드맵

### Phase 1: MVP (현재 - Week 1-3 진행 중)

**인프라 및 인증 (✅ 완료)**
- [x] 프로젝트 초기 설정
- [x] Monorepo 구조 생성 (Turborepo)
- [x] Packages 구조 설정 (db, youtube, ai, types)
- [x] Worker 앱 생성 (Fastify + BullMQ)
- [x] Database 스키마 설계 및 마이그레이션 파일 생성
- [x] PRD v1.2 작성 및 팩트 체크
- [x] YouTube Data API 클라이언트 구현
- [x] AI 서비스 구현 (LiteLLM)
- [x] 데이터베이스 유틸리티 구현
- [x] 환경 설정 가이드 작성 (SETUP_GUIDE.md)
- [x] ~~NextAuth.js 인증 구현~~
- [x] **Supabase Auth 마이그레이션 완료** (2025-11-01)
  - Google OAuth + YouTube API scopes
  - 세션 관리 및 middleware 구현
  - Provider token 저장 및 갱신
  - 사용자 자동 생성 트리거

**다음 단계 (✅ 완료)**
- [x] **온보딩 플로우 구현** (2025-11-01)
  - [x] YouTube 구독 채널 가져오기 API
  - [x] 채널 선택 UI
  - [x] AI 기반 채널 분류 (최근 영상 제목 포함)
  - [x] 채널별 최근 영상 제목 가져오기 (RSS, API quota 무료)
  - [x] 채널 저장 및 사용자 관계 설정
  - [x] 온보딩 완료 후 리다이렉션
  - [x] **RLS 정책 수정 완료** (2025-11-02)
    - users, user_channels, user_settings, bookmarks, watch_history 테이블
    - google_id 기반 정책으로 수정하여 redirect loop 해결

**백엔드 파이프라인 (✅ 완료 - 2025-11-02)**
- [x] **Worker 앱 구현**
  - [x] Fastify 서버 설정 및 로깅 시스템
  - [x] BullMQ 작업 큐 설정 (Redis 연동)
  - [x] RSS 폴링 Job 구현 (`jobs/video-collection.ts`)
    - RSS 피드에서 새 영상 자동 수집
    - 중복 체크 및 메타데이터 업데이트
    - 채널별 병렬 처리
    - **버그 수정 완료** (2025-11-02):
      - RSS 응답 필드명 불일치 수정 (`video.id` → `rssVideo.videoId`)
      - YouTube API로 전체 비디오 메타데이터 가져오기 추가
      - OAuth 토큰 파라미터 위치 수정 (`new YouTubeAPI(undefined, token)`)
      - TypeScript 타입에 `provider_token` 필드 추가
      - **실제 데이터 수집 확인: 1,380개 비디오 정상 저장**
  - [x] AI 요약 생성 Job 구현 (`jobs/summary-generation.ts`)
    - 자막/트랜스크립트 추출 및 저장
    - 4단계 요약 레벨 생성 (한줄, 3줄, 챕터, 전문)
    - 모델 fallback 시스템
  - [x] 자동 스케줄러 (15분 간격 RSS 폴링)
  - [x] 헬스체크 및 통계 엔드포인트
- [x] **데이터베이스 유틸리티 확장**
  - [x] `getUser()` - 사용자 조회
  - [x] `getChannelByYouTubeId()` - 채널 조회
  - [x] `getVideoByYouTubeId()` - 영상 조회
  - [x] `createVideo()` - 영상 생성
  - [x] `updateVideo()` - 영상 업데이트
- [x] **인프라 개선** (2025-11-02)
  - [x] Monorepo ESM 모듈 호환성 문제 해결
    - 모든 패키지 (db, youtube, ai)를 ESM으로 마이그레이션
    - TypeScript `module: "ESNext"`, `moduleResolution: "bundler"` 설정
  - [x] Worker 환경 변수 로딩 순서 수정
    - tsx의 `--env-file` 플래그로 .env.local 사전 로드
    - Supabase 클라이언트 초기화 전 환경 변수 보장
  - [x] Worker 정상 작동 확인 (포트 3001)
  - [x] 비디오 수집 시스템 디버깅 및 안정화 완료

**다음 단계 (🚧 진행 예정)**
- [ ] 메인 대시보드 UI 구현
  - [ ] 영상 피드 API 라우트 (`/api/videos`)
  - [ ] 영상 목록 컴포넌트 및 카드 UI
  - [ ] 카테고리별 필터링
  - [ ] 요약 레벨 토글 (한줄 ↔ 상세)
- [ ] 설정 페이지
  - [ ] 채널 관리 (숨기기/표시, 카테고리 변경)
  - [ ] 요약 레벨 기본값 설정
  - [ ] 알림 설정
- [ ] 북마크 및 시청 기록 UI

### Phase 2: 기능 확장
- [ ] WebSub 실시간 알림
- [ ] 검색 기능
- [ ] 통계 대시보드
- [ ] 모바일 최적화

### Phase 3: 공개 준비
- [ ] 프로덕션 환경 설정
- [ ] 비용 최적화
- [ ] 베타 테스트
- [ ] 공개 출시

## 📖 문서

- [PRD 문서](TubeBrew_PRD.md) - 상세한 제품 요구사항
- [환경 설정 가이드](SETUP_GUIDE.md) - 개발 환경 설정 방법
- API 문서 (TBD)
- 아키텍처 가이드 (TBD)

## 🔧 개발 명령어

```bash
# 개발 서버 실행 (모든 앱)
pnpm dev

# 프로덕션 빌드
pnpm build

# 린트 검사
pnpm lint

# 포맷팅
pnpm format

# 전체 정리
pnpm clean

# Worker 통계 확인
curl http://localhost:3001/stats

# Worker 헬스체크
curl http://localhost:3001/health
```

## 🐛 문제 해결

### Worker 모듈 해석 오류 (해결됨 - 2025-11-02)

**배경**: 초기에 monorepo 패키지들이 CommonJS로 컴파일되어 tsx의 ESM 환경과 충돌이 발생했습니다.

**적용된 해결책**:
1. 모든 패키지를 ESM으로 변환
   - `package.json`에 `"type": "module"` 추가
   - `tsconfig.json`에서 `"module": "ESNext"`, `"moduleResolution": "bundler"` 설정
2. Worker의 환경 변수 로딩 개선
   - `tsx watch --env-file=../../.env.local` 사용으로 Supabase 클라이언트 초기화 전에 env 로드

**현재 상태**: ✅ Worker 정상 작동 중

### Worker가 시작되지 않는 경우

**증상**: Supabase URL 에러 또는 환경 변수 누락

**해결**:
```bash
# .env.local 파일 확인
cat .env.local | grep SUPABASE

# 환경 변수가 없다면 .env.example 참고하여 추가
# 이후 개발 서버 재시작
pkill -f "pnpm dev"
pnpm dev
```

### Redis 연결 실패

**증상**: Worker에서 Redis 연결 에러

**해결**:
1. Upstash Redis 대시보드에서 `REDIS_URL` 확인
2. `.env.local`에 올바른 URL이 설정되어 있는지 확인
3. Redis URL 형식: `redis://default:[password]@[host]:[port]`

### YouTube API Quota 초과

**현재 전략**:
- RSS 피드 사용 (quota 무료)
- youtube-transcript 라이브러리 (quota 무료)
- API는 구독 채널 가져오기와 채널 상세정보에만 사용

**Quota 절약 팁**:
- RSS 피드는 최대 15개 영상만 반환
- 폴링 간격을 15분 이상으로 유지
- 온보딩 시에만 YouTube Data API 사용

## 🤝 기여

이 프로젝트는 현재 개인 프로젝트이며, MVP 단계에서는 외부 기여를 받지 않습니다.

## 📄 라이선스

Private - 개인 프로젝트

## 👤 제작자

**chsong**

---

**현재 상태**: 🚧 개발 중 (Phase 1 - **~70% 완료**, 인프라 안정화 완료 → 대시보드 UI 구현 진행 예정)

**최근 업데이트** (2025-11-02):
- ✅ Worker ESM 모듈 호환성 문제 해결
- ✅ 환경 변수 로딩 순서 개선
- ✅ Worker 서버 정상 작동 확인 (포트 3001)
- ✅ 비디오 수집 시스템 버그 수정 완료
  - RSS 필드명 불일치 해결
  - OAuth 토큰 파라미터 수정
  - TypeScript 타입 업데이트
  - **1,380개 비디오 정상 수집 확인**

## 🎯 현재 작동 상태

### ✅ 동작하는 기능
1. **인증 시스템**
   - Google OAuth 로그인
   - YouTube API 권한 획득
   - 세션 관리 및 토큰 갱신

2. **온보딩 플로우**
   - YouTube 구독 채널 자동 가져오기
   - AI 기반 자동 채널 분류 (15개 카테고리)
   - 채널 리뷰 및 커스터마이징
   - 데이터베이스 저장

3. **백엔드 자동화 시스템**
   - 15분마다 RSS 피드 폴링
   - 새 영상 자동 감지 및 저장
   - AI 요약 자동 생성 (4단계 레벨)
   - BullMQ 작업 큐로 병렬 처리
   - 실패 시 자동 재시도
   - **현재 수집 현황: 1,380개 비디오 (Cole Medin, ArjanCodes, Web Dev Simplified 등)**

### 🚧 개발 필요 (다음 주)
1. **프론트엔드**
   - 대시보드 메인 피드
   - 영상 카드 및 요약 표시
   - 카테고리 필터
   - 설정 페이지

2. **기능 추가**
   - 북마크 UI
   - 시청 기록
   - 검색 기능

## 📊 프로젝트 진행률

```
인증 & 온보딩      ████████████████████ 100%
백엔드 파이프라인   ████████████████████ 100%
데이터베이스       ████████████████████ 100%
AI 통합           ████████████████████ 100%
Worker 자동화     ████████████████████ 100%
인프라 안정화      ████████████████████ 100%
대시보드 UI       ████░░░░░░░░░░░░░░░░  20%
설정 & 관리       ░░░░░░░░░░░░░░░░░░░░   0%
```

**전체 진행률: 약 70%**