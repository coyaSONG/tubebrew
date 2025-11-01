# TubeBrew 환경 설정 가이드

이 가이드는 TubeBrew를 로컬 환경에서 실행하기 위한 단계별 설정 방법을 안내합니다.

## 📋 사전 요구사항

- Node.js 20+
- pnpm 9+ (설치: `npm install -g pnpm` 또는 `brew install pnpm`)
- Google 계정
- 신용카드 (무료 티어 사용 시에도 필요할 수 있음)

---

## 1. Supabase 프로젝트 설정

### 1.1 프로젝트 생성
1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: tubebrew
   - **Database Password**: 강력한 비밀번호 생성 (저장해두기!)
   - **Region**: Northeast Asia (Seoul) - 한국에 가까운 리전 선택
   - **Pricing Plan**: Free (무료 티어)

### 1.2 데이터베이스 스키마 마이그레이션
1. Supabase 대시보드에서 "SQL Editor" 메뉴 선택
2. "New Query" 클릭
3. `packages/db/migrations/20251101000001_initial_schema.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 스키마 생성

### 1.3 API 키 확인
1. Supabase 대시보드에서 "Settings" > "API" 메뉴 선택
2. 다음 정보를 `.env.local`에 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 클라이언트에 노출 금지)

---

## 2. Google Cloud Console 설정

### 2.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단의 프로젝트 선택 드롭다운 클릭 → "새 프로젝트"
3. **프로젝트 이름**: TubeBrew
4. "만들기" 클릭

### 2.2 OAuth 2.0 클라이언트 설정
1. 좌측 메뉴: "APIs & Services" > "OAuth consent screen"
2. User Type: **External** 선택 → "만들기"
3. 앱 정보 입력:
   - **App name**: TubeBrew
   - **User support email**: 본인 이메일
   - **Developer contact information**: 본인 이메일
4. "저장 후 계속" 클릭
5. Scopes 단계: "저장 후 계속" (기본값 사용)
6. Test users 단계: "+ ADD USERS" 클릭 → 본인 Gmail 추가

7. 좌측 메뉴: "Credentials" > "+ CREATE CREDENTIALS" > "OAuth client ID"
8. Application type: **Web application**
9. Name: TubeBrew Web Client
10. Authorized redirect URIs 추가:
    ```
    http://localhost:3000/api/auth/callback/google
    ```
11. "만들기" 클릭
12. Client ID와 Client Secret을 `.env.local`에 복사:
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`

### 2.3 YouTube Data API v3 활성화
1. 좌측 메뉴: "APIs & Services" > "Library"
2. "YouTube Data API v3" 검색
3. "사용 설정" 클릭
4. 좌측 메뉴: "Credentials" > "+ CREATE CREDENTIALS" > "API Key"
5. 생성된 API Key를 `.env.local`에 복사:
    - `YOUTUBE_API_KEY`

⚠️ **API 할당량**: 무료 티어는 일일 10,000 units (충분함)

---

## 3. Upstash Redis 설정

### 3.1 계정 생성 및 데이터베이스 생성
1. [Upstash](https://upstash.com) 접속 및 가입
2. "Create Database" 클릭
3. 설정:
   - **Name**: tubebrew-redis
   - **Type**: Regional
   - **Region**: Asia Pacific (Seoul) - 가까운 리전 선택
   - **TLS**: Enabled
4. "Create" 클릭

### 3.2 Redis URL 복사
1. 생성된 데이터베이스 클릭
2. "REST API" 탭에서 "UPSTASH_REDIS_REST_URL" 복사
3. `.env.local`에 추가:
   ```
   REDIS_URL=<복사한 URL>
   ```

---

## 4. AI 서비스 설정

### 4.1 개발 환경: OpenRouter (무료)
1. [OpenRouter](https://openrouter.ai) 접속 및 가입
2. "API Keys" 메뉴에서 새 키 생성
3. `.env.local`에 추가:
   ```
   OPENROUTER_API_KEY=<생성한 키>
   ```

### 4.2 프로덕션 환경: OpenAI (선택사항)
1. [OpenAI Platform](https://platform.openai.com) 접속
2. API Keys 메뉴에서 새 키 생성
3. `.env.local`에 추가:
   ```
   OPENAI_API_KEY=<생성한 키>
   ```

💡 **비용**: GPT-4o-mini 사용 시 월 $1-2 예상

---

## 5. NextAuth Secret 생성

터미널에서 다음 명령어 실행:

```bash
openssl rand -base64 32
```

출력된 값을 `.env.local`에 추가:
```
NEXTAUTH_SECRET=<생성된 값>
```

---

## 6. 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

위에서 수집한 모든 값으로 `.env.local` 파일을 업데이트하세요.

### 최종 `.env.local` 예시:

```env
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Google OAuth & YouTube
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
YOUTUBE_API_KEY=AIzaSy...

# AI Services
OPENROUTER_API_KEY=sk-or-v1-xxxxx
# OPENAI_API_KEY=sk-xxxxx  # 프로덕션 시 사용

# Redis (Upstash)
REDIS_URL=https://xxxxx.upstash.io

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxx

# App Config
NODE_ENV=development
```

---

## 7. 의존성 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

웹 앱: http://localhost:3000
Worker 서버: http://localhost:3001

---

## 8. 데이터베이스 타입 생성

Supabase 스키마에서 TypeScript 타입을 자동 생성:

```bash
pnpm db:generate-types
```

---

## ✅ 설정 완료 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 마이그레이션 실행 완료
- [ ] Google OAuth 클라이언트 생성 완료
- [ ] YouTube Data API 활성화 완료
- [ ] Upstash Redis 데이터베이스 생성 완료
- [ ] OpenRouter API 키 발급 완료
- [ ] NextAuth Secret 생성 완료
- [ ] `.env.local` 파일 생성 및 모든 값 입력 완료
- [ ] `pnpm install` 실행 완료
- [ ] `pnpm dev`로 서버 정상 구동 확인

---

## 🔧 문제 해결

### Supabase 연결 오류
- URL과 키가 정확한지 확인
- Supabase 프로젝트가 활성 상태인지 확인

### Google OAuth 오류
- Redirect URI가 정확히 일치하는지 확인
- OAuth Consent Screen이 "Testing" 상태인지 확인
- Test users에 본인 이메일이 추가되었는지 확인

### Redis 연결 오류
- REDIS_URL 형식이 올바른지 확인 (https:// 포함)
- Upstash 데이터베이스가 활성 상태인지 확인

### YouTube API 할당량 오류
- Google Cloud Console에서 할당량 확인
- 하루 10,000 units 제한 확인

---

## 📞 추가 도움말

문제가 지속되면 다음을 확인하세요:
1. Node.js 버전: `node -v` (20 이상 필요)
2. pnpm 버전: `pnpm -v` (9 이상 필요)
3. 콘솔 에러 로그 확인
4. `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인 (보안)
