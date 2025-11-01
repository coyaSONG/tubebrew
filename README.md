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
│   └── worker/                 # 백그라운드 작업 서버 (TODO)
├── packages/
│   ├── db/                     # Supabase 클라이언트 및 타입
│   ├── youtube/                # YouTube API 래퍼
│   ├── ai/                     # AI 통합 (요약, 트랜스크립션)
│   └── types/                  # 공유 타입 정의
```

## 🚀 기술 스택

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: React Context / Zustand (TBD)

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (Upstash)
- **Auth**: NextAuth.js + Google OAuth

### AI & External Services
- **LLM**: LiteLLM (OpenRouter for dev, OpenAI/Claude for prod)
- **Transcription**: OpenAI Whisper API
- **YouTube**: YouTube Data API v3, PubSubHubbub

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 20+
- npm 10+

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd tubebrew

# 의존성 설치
npm install
```

### 환경 변수 설정

```bash
# 루트 디렉토리에 .env.local 생성
cp .env.example .env.local

# apps/web에도 .env.local 생성
cp apps/web/.env.local.example apps/web/.env.local
```

필요한 환경 변수를 `.env.local` 파일에 입력하세요:
- Supabase 프로젝트 URL 및 키
- Google OAuth 클라이언트 ID/Secret
- YouTube API 키
- AI 서비스 API 키 (OpenRouter, OpenAI 등)

### 개발 서버 실행

```bash
# 모든 앱을 동시에 실행 (Turborepo)
npm run dev

# 또는 개별 실행
cd apps/web
npm run dev
```

웹 앱은 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 🗂️ 개발 로드맵

### Phase 1: MVP (현재)
- [x] 프로젝트 초기 설정
- [x] Monorepo 구조 생성
- [ ] Google OAuth 인증
- [ ] YouTube 구독 채널 수집
- [ ] AI 기반 채널 분류
- [ ] 영상 수집 파이프라인
- [ ] AI 요약 생성
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

- [PRD 문서](../Downloads/TubeBrew_PRD.md) - 상세한 제품 요구사항
- API 문서 (TBD)
- 아키텍처 가이드 (TBD)

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint

# 포맷팅
npm run format

# 전체 정리
npm run clean
```

## 🤝 기여

이 프로젝트는 현재 개인 프로젝트이며, MVP 단계에서는 외부 기여를 받지 않습니다.

## 📄 라이선스

Private - 개인 프로젝트

## 👤 제작자

**chsong**

---

**현재 상태**: 🚧 개발 중 (Phase 1 - Week 1)
