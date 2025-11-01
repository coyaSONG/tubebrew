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
- **LLM**: LiteLLM
  - Dev: OpenRouter (무료 모델)
  - Prod: OpenAI GPT-4o-mini, Claude Sonnet 4
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

4. **AI 서비스**
   - Dev: `OPENROUTER_API_KEY` (무료 모델 사용)
   - Prod: `OPENAI_API_KEY` (GPT-4o-mini)

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

**다음 단계 (🚧 진행 예정)**
- [ ] **온보딩 플로우 구현**
  - [ ] YouTube 구독 채널 가져오기 API
  - [ ] 채널 선택 UI
  - [ ] AI 기반 채널 분류
- [ ] 영상 수집 파이프라인 (RSS Feed)
- [ ] AI 요약 생성 통합
- [ ] 메인 대시보드 UI

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
# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 린트 검사
pnpm lint

# 포맷팅
pnpm format

# 전체 정리
pnpm clean
```

## 🤝 기여

이 프로젝트는 현재 개인 프로젝트이며, MVP 단계에서는 외부 기여를 받지 않습니다.

## 📄 라이선스

Private - 개인 프로젝트

## 👤 제작자

**chsong**

---

**현재 상태**: 🚧 개발 중 (Phase 1 - Week 1-3, Supabase Auth 완료 → 온보딩 플로우 진행 예정)
