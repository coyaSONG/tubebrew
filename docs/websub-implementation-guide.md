# WebSub (PubSubHubbub) 구현 가이드

**작성일**: 2025-11-02
**버전**: 1.0
**프로젝트**: TubeBrew

---

## 📋 개요

이 문서는 TubeBrew의 WebSub (PubSubHubbub) 구현에 대한 완전한 가이드입니다. WebSub을 사용하면 YouTube 채널의 새 영상 업로드를 실시간으로 감지할 수 있으며, RSS polling에 비해 90% 이상의 Redis 명령어를 절약할 수 있습니다.

---

## 🎯 구현 완료 항목

### ✅ 1. 데이터베이스 마이그레이션
- **파일**: `packages/db/migrations/20251102000002_add_websub_subscriptions.sql`
- **테이블**: `channel_websub_subscriptions`
- **기능**: WebSub 구독 상태 추적 및 관리

### ✅ 2. WebSub Routes
- **파일**: `apps/worker/src/routes/websub.ts`
- **엔드포인트**:
  - `GET /websub/callback` - 구독 검증
  - `POST /websub/callback` - 알림 수신
  - `GET /websub/status` - 구독 상태 모니터링

### ✅ 3. WebSub Manager
- **파일**: `apps/worker/src/services/websub-manager.ts`
- **기능**:
  - 채널 구독/구독 취소
  - 만료 구독 갱신
  - 실패한 구독 재시도
  - 전체 채널 일괄 구독

### ✅ 4. Worker 통합
- **파일**: `apps/worker/src/index.ts`
- **변경사항**:
  - WebSub routes 등록
  - BullMQ 최적화 설정 (`drainDelay`, `stalledInterval`)
  - RSS polling을 일일 1회 fallback으로 변경
  - 구독 갱신 및 재시도 스케줄러 추가

### ✅ 5. 환경 변수
- **파일**: `.env.example`
- **새 변수**:
  - `WEBSUB_CALLBACK_URL`: WebSub 콜백 URL

---

## 🚀 로컬 개발 환경 설정

### 1. 데이터베이스 마이그레이션 실행

```bash
# Supabase CLI 사용
cd packages/db
supabase migration up

# 또는 Supabase Dashboard에서 SQL 직접 실행
# migrations/20251102000002_add_websub_subscriptions.sql 내용 복사/붙여넣기
```

### 2. 로컬 Redis 실행

```bash
# Docker 사용
docker run -d -p 6379:6379 redis:7-alpine

# 또는 docker-compose.yml에 추가:
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 3. 환경 변수 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local

# 환경 변수 설정
REDIS_URL=redis://localhost:6379
PORT=3001
WEBSUB_CALLBACK_URL=http://localhost:3001/websub/callback  # ngrok 사용 시 변경 필요
```

### 4. ngrok 설정 (WebSub 테스트용)

WebSub은 공개 URL이 필요하므로 개발 환경에서는 ngrok을 사용합니다.

```bash
# ngrok 설치 (macOS)
brew install ngrok

# ngrok 실행
ngrok http 3001

# 출력에서 https URL 확인:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3001

# .env.local 업데이트
WEBSUB_CALLBACK_URL=https://abc123.ngrok.io/websub/callback
```

### 5. Worker 실행

```bash
# 의존성 설치
pnpm install

# Worker 실행
cd apps/worker
pnpm dev
```

### 6. 구독 상태 확인

```bash
# WebSub 구독 상태 확인
curl http://localhost:3001/websub/status

# 또는 브라우저에서:
http://localhost:3001/websub/status
```

---

## 🧪 테스트 방법

### 1. 수동 구독 테스트

Google의 PubSubHubbub 인터페이스 사용:
- URL: https://pubsubhubbub.appspot.com/subscribe
- **Hub Callback**: ngrok URL (예: `https://abc123.ngrok.io/websub/callback`)
- **Hub Topic**: `https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID`
- **Hub Mode**: `subscribe`
- **Hub Verify**: `sync`

"Do it!" 버튼 클릭 후:
1. Worker 로그에서 검증 요청 확인
2. Database에서 구독 상태 `verified` 확인

### 2. 알림 수신 테스트

1. 구독한 채널에 새 영상 업로드
2. Worker 로그에서 POST 요청 확인:
   ```
   Processing WebSub notification: { videoId, channelId, title }
   ```
3. BullMQ 큐에 job 추가 확인:
   ```bash
   curl http://localhost:3001/stats
   ```

### 3. DB 상태 확인

```sql
-- 구독 상태 확인
SELECT
  youtube_channel_id,
  status,
  hub_lease_expires_at,
  last_notification_at,
  subscribe_attempts
FROM channel_websub_subscriptions
ORDER BY created_at DESC;

-- 최근 알림 수신 확인
SELECT
  youtube_channel_id,
  last_notification_at,
  EXTRACT(EPOCH FROM (NOW() - last_notification_at))/3600 as hours_since_last
FROM channel_websub_subscriptions
WHERE status = 'verified'
ORDER BY last_notification_at DESC NULLS LAST;
```

---

## 📊 모니터링

### 구독 상태 API

```bash
GET /websub/status
```

**응답 예시**:
```json
{
  "stats": {
    "total": 50,
    "verified": 45,
    "pending": 2,
    "failed": 1,
    "expired": 2,
    "expiring_soon": 5
  },
  "subscriptions": [/* 최근 20개 */]
}
```

### 주요 메트릭

1. **구독 성공률**: `verified / total`
2. **구독 만료율**: `expired / total`
3. **평균 알림 수신 간격**: `last_notification_at` 기준
4. **구독 재시도 횟수**: `subscribe_attempts`

### 로그 모니터링

```bash
# Worker 로그 실시간 확인
cd apps/worker
pnpm dev

# 중요 로그 패턴:
# - "Subscription verified" - 구독 성공
# - "Processing WebSub notification" - 알림 수신
# - "WebSub subscription request failed" - 구독 실패
```

---

## 🔧 문제 해결

### 1. 구독이 `pending` 상태로 유지됨

**원인**: YouTube hub가 callback URL을 검증하지 못함

**해결**:
1. ngrok이 실행 중인지 확인
2. `WEBSUB_CALLBACK_URL`이 올바른 ngrok URL인지 확인
3. Worker가 실행 중인지 확인
4. Firewall/방화벽 설정 확인

```bash
# ngrok 상태 확인
curl http://localhost:4040/api/tunnels

# Worker 엔드포인트 테스트
curl https://your-ngrok-url.ngrok.io/health
```

### 2. 알림을 받지 못함

**원인**: 구독 만료 또는 YouTube hub 장애

**해결**:
1. 구독 상태 확인:
   ```sql
   SELECT status, hub_lease_expires_at
   FROM channel_websub_subscriptions
   WHERE youtube_channel_id = 'CHANNEL_ID';
   ```

2. 구독 갱신:
   ```bash
   # Worker 재시작하거나 API 호출로 강제 갱신
   curl -X POST http://localhost:3001/trigger-collection
   ```

3. Fallback RSS polling 확인:
   - 일일 1회 자동 실행되므로 24시간 내 복구됨

### 3. Redis 명령어 수가 여전히 높음

**원인**: BullMQ 설정 미적용 또는 많은 job 처리 중

**확인사항**:
1. BullMQ 설정 확인:
   ```typescript
   settings: {
     drainDelay: 300000, // 5분
     stalledInterval: 600000, // 10분
   }
   ```

2. 활성 job 수 확인:
   ```bash
   curl http://localhost:3001/stats
   ```

3. WebSub이 실제로 작동하는지 확인:
   ```sql
   SELECT COUNT(*) as notifications_last_24h
   FROM channel_websub_subscriptions
   WHERE last_notification_at > NOW() - INTERVAL '24 hours';
   ```

---

## 🏭 프로덕션 배포

### 1. 환경 변수 설정

```bash
# Vercel/Railway/기타 호스팅 환경에서:
WEBSUB_CALLBACK_URL=https://your-production-domain.com/websub/callback
REDIS_URL=your-upstash-redis-url
NODE_ENV=production
```

### 2. 데이터베이스 마이그레이션

```bash
# Supabase Dashboard에서 SQL 실행
# 또는 CI/CD에서 자동 실행
supabase db push
```

### 3. 초기 구독

Worker 시작 2분 후 자동으로 모든 채널 구독 시작.

```bash
# 로그에서 확인:
# "Subscribing to all user channels via WebSub"
# "Subscription verified: { youtubeChannelId, leaseSeconds }"
```

### 4. 모니터링 설정

```bash
# 구독 상태 주기적 확인 (cron job 또는 monitoring service)
curl https://your-domain.com/websub/status
```

---

## 📈 예상 효과

### Before (RSS Polling)
- Polling 주기: 15분
- 일일 명령어 수: ~216,000 commands/day
- 월간 명령어 수: ~6.48M commands/month
- 비용: $13/month (Upstash Pay-as-you-go)

### After (WebSub)
- 실시간 알림 + 일일 1회 fallback
- 일일 명령어 수: ~10,000-20,000 commands/day
- 월간 명령어 수: ~300K-600K commands/month
- 비용: $0 (Upstash Free tier 충분)
- **절감률**: 90-95%

### 추가 이점
- ✅ 실시간성: 15분 → 즉시
- ✅ 확장성: 채널 증가 시 비용 선형 증가 없음
- ✅ 안정성: Fallback RSS로 이중 보호
- ✅ 유지보수: 자동 구독 갱신 및 재시도

---

## 🔄 업그레이드 경로

### Phase 1 (완료)
- ✅ WebSub 기본 구현
- ✅ Fallback RSS polling (일일 1회)
- ✅ 구독 관리 시스템

### Phase 2 (향후 계획)
- [ ] 구독 상태 대시보드 (Web UI)
- [ ] 알림 수신률 analytics
- [ ] 자동 구독 복구 시스템 고도화
- [ ] WebSub 성능 메트릭 수집

### Phase 3 (선택 사항)
- [ ] 여러 YouTube hub 지원 (redundancy)
- [ ] Custom WebSub hub 구현 (완전 제어)
- [ ] WebSub 이벤트 로그 저장 및 분석

---

## 📚 참고 자료

### 공식 문서
- [YouTube WebSub Guide](https://developers.google.com/youtube/v3/guides/push_notifications)
- [PubSubHubbub Spec](https://pubsubhubbub.github.io/PubSubHubbub/pubsubhubbub-core-0.4.html)
- [Google Hub](https://pubsubhubbub.appspot.com/)

### 커뮤니티 자료
- [WebSub with Rails Tutorial](https://www.youtube.com/watch?v=QQSJGS2JR4w)
- [Kevin Cox WebSub Analysis](https://kevincox.ca/2021/12/16/youtube-websub/)

### 내부 문서
- [Redis 최적화 연구 보고서](./redis-optimization-research.md)

---

## ❓ FAQ

### Q: WebSub은 모든 YouTube 이벤트를 지원하나요?
**A**: 아니요. 다음 이벤트만 지원됩니다:
- 새 영상 업로드
- 영상 제목 수정
- 영상 설명 수정

재생목록, 좋아요, 댓글 등은 지원하지 않습니다.

### Q: WebSub 구독이 실패하면 어떻게 되나요?
**A**: 3가지 안전장치가 있습니다:
1. 자동 재시도 (6시간마다)
2. Fallback RSS polling (24시간마다)
3. 구독 상태 모니터링 및 알림

### Q: 개발 환경에서 ngrok 없이 테스트할 수 있나요?
**A**: 로컬 테스트는 제한적입니다. YouTube hub는 공개 URL만 허용하므로:
- ngrok 또는 유사 터널링 서비스 필요
- 대안: 구독 로직만 단위 테스트

### Q: 구독 lease가 만료되면?
**A**: 자동으로 갱신됩니다:
- 만료 48시간 전에 자동 갱신 시도
- 실패 시 6시간마다 재시도
- 최악의 경우 일일 RSS polling이 backup

### Q: 한 번에 몇 개의 채널을 구독할 수 있나요?
**A**: 제한 없습니다. 단, 구독 요청 시 1초 delay를 두어 rate limiting 방지:
- 50개 채널 = 약 50초
- 100개 채널 = 약 100초

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-02
**문의**: GitHub Issues
