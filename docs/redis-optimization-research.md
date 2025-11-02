# Redis Free Tier 한도 개선 방안 연구 보고서

**작성일**: 2025-11-02
**프로젝트**: TubeBrew
**목적**: Upstash Redis Free Tier 한도 초과 문제 해결 방안 조사 및 권장사항 제시

---

## 📊 Executive Summary

**핵심 발견사항**:
- 현재 15분 주기 polling 방식은 Upstash Free Tier(500K commands/month)를 **21.6배 초과** 사용 중
- 예상 사용량: ~216,000 commands/day (단순 사용자 1명, 50개 채널 기준)
- **최우선 권장사항**: WebSub (PubSubHubbub) 전환 → 90% 이상 명령어 감소 + 실시간 알림

---

## 1️⃣ Upstash Redis 가격 정책 (2025년 기준)

### Free Tier 제한사항
```
✅ 포함 내역:
- 500K commands/month (기존 10K/day에서 변경됨)
- 256MB 데이터 크기
- 10GB bandwidth/month
- 10,000 requests/sec

❌ 초과 시:
- Rate limiting 적용
- 서비스 중단 가능
```

### 유료 플랜 옵션

| 플랜 | 가격 | 명령어 수 | 적합성 |
|------|------|----------|--------|
| **Pay-as-you-go** | $0.20/100K commands | Unlimited | ⭐ **권장** (개발/소규모) |
| Fixed $10/month | $10/month | - | 중규모 프로덕션 |
| Fixed $20/month | $20/month | - | 대규모 프로덕션 |

**월간 예상 비용 계산** (현재 사용 패턴):
- 216K commands/day × 30일 = 6.48M commands/month
- 비용: 6.48M ÷ 100K × $0.20 = **~$13/month**

---

## 2️⃣ WebSub (PubSubHubbub) 전환 분석

### ✅ 장점
1. **비용 절감**: 90-95% Redis 명령어 감소
   - polling 제거 → 실제 영상 업로드 시에만 job 생성
   - 예상 감소: 216K/day → 10-20K/day
2. **실시간성**: 영상 업로드 즉시 알림 (15분 대기 불필요)
3. **YouTube 공식 지원**: Google의 공식 WebSub hub 사용
4. **확장성**: 사용자/채널 증가 시에도 비용 선형 증가 없음

### ⚠️ 단점 및 과제
1. **구현 복잡도**: 중간 수준
   - Callback server 설정 필요 (이미 Fastify 서버 존재)
   - Ngrok/공개 URL 필요 (개발), 프로덕션은 기존 도메인 사용 가능
   - 구독 갱신 로직 (lease 기간 관리)

2. **신뢰성 고려사항**:
   - WebSub hub 장애 시 fallback 필요
   - 구독 상태 모니터링 필요
   - 누락된 알림 감지 메커니즘 (주기적 RSS 확인)

3. **YouTube 제약사항**:
   - 알림 이벤트: 영상 업로드, 제목/설명 수정만 지원
   - 재생목록, 좋아요 등 다른 이벤트는 미지원

### 📚 구현 참고 자료
- [YouTube 공식 문서](https://developers.google.com/youtube/v3/guides/push_notifications)
- [Rails 튜토리얼](https://www.youtube.com/watch?v=QQSJGS2JR4w)
- [Kevin Cox 블로그](https://kevincox.ca/2021/12/16/youtube-websub/)

### 🛠️ 구현 단계 (예상 소요시간: 1-2일)
1. **Callback endpoint 추가** (1-2시간)
   - `POST /webhooks/youtube` 추가
   - Atom feed parsing 로직
   - 검증 로직 (GET request handling)

2. **구독 관리 시스템** (2-4시간)
   - DB 테이블: `channel_subscriptions` (channel_id, hub_lease_expires_at, status)
   - 자동 구독 갱신 job
   - 구독 실패 재시도

3. **Fallback 메커니즘** (2-3시간)
   - 마지막 알림 시간 추적
   - 24시간 미수신 시 RSS polling으로 fallback

---

## 3️⃣ BullMQ 최적화 전략

### 현재 문제점
- **drainDelay**: 기본값 5초 → Worker가 대기 중에도 지속적으로 Redis polling
- **stalled check**: 30초마다 실행
- **Job 당 명령어 수**: 15-20 commands/job

### 최적화 옵션

#### Option A: drainDelay 증가
```typescript
const videoCollectionWorker = new Worker(
  'video-collection',
  processVideoCollection,
  {
    connection: redisConnection,
    concurrency: 3,
    settings: {
      drainDelay: 300000, // 5분 (기본 5초)
    }
  }
);
```

**효과**:
- Idle 상태 polling 60배 감소
- 단, delayed jobs 있을 경우 효과 제한적

#### Option B: stalledInterval 조정
```typescript
const settings = {
  stalledInterval: 1800000, // 30분 (기본 30초)
  guardInterval: 10000, // 10초 (기본 5초)
}
```

**효과**:
- Stalled check 명령어 60배 감소
- 주의: Worker 장애 감지 지연 증가

### 🎯 권장 설정 (WebSub 전환 시)
```typescript
// WebSub 사용 시 polling 빈도 대폭 감소 가능
const settings = {
  stalledInterval: 600000, // 10분
  guardInterval: 60000,    // 1분
};

const worker = new Worker('video-collection', processVideoCollection, {
  connection: redisConnection,
  concurrency: 2,  // 동시 처리 감소 (필요 시)
  settings: {
    drainDelay: 300000, // 5분
  }
});
```

---

## 4️⃣ 대안 Redis 서비스

### 로컬 Redis (개발 환경)
```bash
# Docker Compose
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**장점**: 무료, 무제한
**단점**: 프로덕션 부적합, 로컬에서만 사용

### Railway Redis
- **무료 플랜 없음** (2024년 이후)
- 최소 $5/month

### 기타 옵션
1. **Redis Labs (Redis Cloud)**: Free 30MB, 30 connections
2. **Render Redis**: Free tier 있음 (제한적)
3. **Self-hosted**: DigitalOcean/AWS EC2 ($5-10/month)

---

## 5️⃣ YouTube API 최적화

### RSS Feed 최적화
현재 사용 중: `youtube-transcript` (무료)

**Best Practices**:
1. **Cache-Control 헤더 존중**
   - YouTube RSS: 보통 15분 캐싱 권장
   - 현재 설정(15분 polling)은 적절

2. **조건부 요청 사용**
   ```typescript
   // ETag 기반 캐싱
   const headers = {
     'If-None-Match': lastETag
   };
   ```

3. **Batch 요청**
   ```typescript
   // 여러 채널을 동시에 처리
   await Promise.all(channels.map(ch => fetchRSS(ch)));
   ```

### YouTube Data API 쿼터 절약
- **기본 쿼터**: 10,000 units/day
- **fields 파라미터 사용**: 필요한 필드만 요청
  ```typescript
  // Before: 1 cost
  youtube.videos.list({part: 'snippet,statistics'})

  // After: 1 cost (데이터 크기만 감소)
  youtube.videos.list({
    part: 'snippet,statistics',
    fields: 'items(id,snippet(title),statistics(viewCount))'
  })
  ```

---

## 6️⃣ 비용-효과 분석 매트릭스

| 솔루션 | 구현 난이도 | 초기 비용 | 월간 비용 | 명령어 절감 | 권장도 |
|--------|------------|----------|----------|------------|--------|
| **WebSub 전환** | 중간 (1-2일) | $0 | $0 | 90-95% | ⭐⭐⭐⭐⭐ |
| Upstash Pay-as-you-go | 쉬움 (즉시) | $0 | ~$13 | 0% | ⭐⭐⭐⭐ |
| BullMQ 최적화만 | 쉬움 (1시간) | $0 | $0 | 30-50% | ⭐⭐⭐ |
| Polling 주기 증가 (1시간) | 쉬움 (10분) | $0 | $0 | 75% | ⭐⭐ |
| 로컬 Redis (dev only) | 쉬움 (10분) | $0 | $0 | 100% (dev) | ⭐⭐⭐ |

---

## 7️⃣ 단계별 실행 계획

### Phase 1: 즉시 조치 (오늘)
1. ✅ **로컬 Redis로 개발 환경 전환**
   ```typescript
   const redisConnection = new Redis(
     process.env.NODE_ENV === 'production'
       ? process.env.REDIS_URL
       : 'redis://localhost:6379'
   );
   ```

2. ✅ **Polling 주기 임시 증가** (Upstash 보호용)
   ```typescript
   // 15분 → 2시간
   setInterval(async () => {
     await scheduleVideoCollection();
   }, 120 * 60 * 1000);
   ```

### Phase 2: 1주일 내 (권장)
3. 🎯 **WebSub 구현**
   - Callback endpoint 추가
   - 구독 관리 시스템
   - Fallback RSS polling (24시간 주기)

### Phase 3: 프로덕션 준비
4. **모니터링 설정**
   - Redis 사용량 대시보드
   - WebSub 구독 상태 모니터링
   - 알림 수신률 추적

5. **비용 결정**
   - WebSub 구현 성공 시: Free tier 유지 가능
   - WebSub 보류 시: Upstash Pay-as-you-go ($13/month)

---

## 8️⃣ 최종 권장사항

### 🏆 Best Solution: WebSub + BullMQ 최적화
```typescript
// 1. WebSub으로 실시간 알림 수신
app.post('/webhooks/youtube', handleWebSubNotification);

// 2. Fallback RSS polling (1일 1회)
setInterval(async () => {
  await scheduleVideoCollection();
}, 24 * 60 * 60 * 1000);

// 3. BullMQ 최적화 설정
const worker = new Worker('video-collection', processJob, {
  connection: redisConnection,
  concurrency: 2,
  settings: {
    drainDelay: 300000,
    stalledInterval: 600000,
  }
});
```

**예상 결과**:
- Redis 명령어: 216K/day → 10-20K/day (90% 절감)
- Free tier 여유: 500K/month - 600K/month ≈ **여유 있음**
- 실시간성: 15분 대기 → 즉시 알림
- 월간 비용: $0

### 📊 ROI 분석
- **구현 시간**: 1-2일
- **절감 비용**: $13/month × 12 = $156/year
- **추가 가치**: 실시간 알림, 확장성, 안정성

---

## 9️⃣ 참고 자료

### 공식 문서
- [Upstash Pricing (2025)](https://upstash.com/docs/redis/overall/pricing)
- [YouTube WebSub Guide](https://developers.google.com/youtube/v3/guides/push_notifications)
- [BullMQ Settings](https://docs.bullmq.io/guide/workers/worker-options)

### 커뮤니티 사례
- [BullMQ + Upstash 최적화 사례](https://github.com/OptimalBits/bull/discussions/2457)
- [Dragonfly BullMQ 최적화](https://www.dragonflydb.io/blog/running-bullmq-with-dragonfly-part-2-optimization)

### 구현 예제
- [Rails WebSub 구현](https://www.youtube.com/watch?v=QQSJGS2JR4w)
- [Kevin Cox WebSub 분석](https://kevincox.ca/2021/12/16/youtube-websub/)

---

## 🔍 결론

**현재 상황**: Upstash Free Tier 한도를 21.6배 초과 사용 중 (예상)

**최적 해결책**:
1. **단기**: 로컬 Redis (개발) + Polling 주기 증가 (임시)
2. **장기**: WebSub 전환 (1-2일 개발)
3. **대안**: Upstash Pay-as-you-go ($13/month)

**권장 순서**:
1. 오늘: 로컬 Redis + Polling 2시간 주기
2. 이번 주: WebSub 구현 시작
3. 다음 주: WebSub 테스트 및 프로덕션 배포
4. 모니터링: 사용량 확인 후 Free tier 유지 또는 유료 전환 결정

WebSub 구현이 가장 비용 효율적이고 기술적으로도 우수한 솔루션입니다. PRD에도 이미 Phase 2+ 계획으로 포함되어 있으므로, 이번 기회에 조기 구현하는 것을 강력히 권장합니다.
