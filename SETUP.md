# TubeBrew 개발 환경 설정 가이드

## 📋 완료된 설정 (2025-11-01)

### ✅ 프로젝트 구조
```
tubebrew/
├── apps/
│   ├── web/          # Next.js 16 + React 19
│   └── worker/       # Fastify + BullMQ
├── packages/
│   ├── db/           # Supabase + Migrations
│   ├── youtube/      # YouTube API + youtube-transcript
│   ├── ai/           # LiteLLM
│   └── types/        # Shared TypeScript types
```

### ✅ 설치 완료
```bash
# Dependencies 설치 완료
pnpm install  # 517 packages installed
```

## ⚠️ 알려진 이슈

### React 19 + Next.js 16 타입 충돌

**현상:**
```
Type error: Type 'React.ReactNode' is not assignable to type 'ReactNode'
```

**원인:**
- React 19와 Next.js 16의 타입 정의 충돌
- Next.js 내부의 @types/react와 apps/web의 @types/react 버전 불일치

**현재 상태:**
- ✅ **dev 모드 정상 작동** (`pnpm dev`)
- ❌ **build 모드 타입 에러** (`pnpm build`)

**해결 방법:**
1. **단기 (현재)**: dev 모드로 개발 진행
   ```bash
   pnpm dev  # 정상 작동
   ```

2. **중기**: Next.js/React 업데이트 대기
   - Next.js 16.1+ 또는 React 19.3+ 릴리스 대기
   - 타입 정의 통합 예정

3. **대안**: layout.tsx를 .jsx로 변환 (타입 체크 우회)
   ```bash
   mv apps/web/src/app/layout.tsx apps/web/src/app/layout.jsx
   ```

## 🚀 다음 단계

### 1. Supabase 프로젝트 생성
```bash
# 1. https://supabase.com 에서 프로젝트 생성
# 2. SQL Editor에서 마이그레이션 실행:
cat packages/db/migrations/20251101000001_initial_schema.sql
# 3. Settings > API에서 URL과 키 복사
```

### 2. 환경 변수 설정
```bash
# .env.local 생성
cp .env.example .env.local

# 필수 환경 변수:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
YOUTUBE_API_KEY=AIzaSyxxx

NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

REDIS_URL=redis://...
OPENROUTER_API_KEY=sk-or-xxx
```

### 3. 개발 서버 실행
```bash
# Turbo dev (모든 앱 동시 실행)
pnpm dev

# Web만 실행
cd apps/web
pnpm dev

# Worker만 실행
cd apps/worker
pnpm dev
```

### 4. Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성
3. "APIs & Services" > "OAuth consent screen" 설정
4. "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Client ID와 Secret을 .env.local에 추가

### 5. YouTube API 설정
1. Google Cloud Console > "APIs & Services" > "Library"
2. "YouTube Data API v3" 검색 후 활성화
3. "Credentials" > "Create Credentials" > "API Key"
4. API 키를 .env.local에 추가

## 📚 참고 문서

- **PRD**: `TubeBrew_PRD.md` (v1.1)
- **README**: `README.md`
- **DB Schema**: `packages/db/migrations/20251101000001_initial_schema.sql`

## 🐛 문제 해결

### 빌드 에러 발생 시
```bash
# 1. dev 모드로 개발 진행
pnpm dev

# 2. 타입 체크 무시 (임시)
# next.config.ts에 추가:
typescript: {
  ignoreBuildErrors: true,
}

# 3. layout을 .jsx로 변환
mv apps/web/src/app/layout.tsx apps/web/src/app/layout.jsx
```

### 의존성 문제 발생 시
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
rm -rf apps/*/node_modules packages/*/node_modules
pnpm install
```

### Turbo 캐시 문제 발생 시
```bash
pnpm clean
pnpm install
pnpm dev
```

## ✅ 검증 체크리스트

- [x] 프로젝트 구조 생성
- [x] Dependencies 설치
- [x] Turborepo 설정
- [x] DB Schema 작성
- [x] Worker 앱 생성
- [x] Dev 모드 정상 작동 확인
- [ ] Supabase 프로젝트 생성
- [ ] Google OAuth 설정
- [ ] YouTube API 설정
- [ ] 환경 변수 설정
- [ ] NextAuth 구현
- [ ] 첫 로그인 성공

---

**현재 상태**: Week 1 완료 - 프로젝트 구조 및 설정 완료
**다음 작업**: Google OAuth 인증 구현 (Week 2)
