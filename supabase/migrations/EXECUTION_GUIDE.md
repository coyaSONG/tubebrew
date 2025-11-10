# 🚀 Supabase 최적화 마이그레이션 실행 가이드

## 빠른 시작

### 1️⃣ 사전 준비

```bash
# 백업 생성 (Supabase Dashboard)
1. Dashboard → Database → Backups → Create Backup
2. 백업 완료 확인

# 환경 변수 설정
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
export SUPABASE_PROJECT_REF="your-project-ref"
```

### 2️⃣ 실행 단계별 가이드

#### 단계 1: 보안 수정 (필수) ✅

```bash
# Migration 001 실행
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_001_fix_security_issues.sql

# 검증
psql $SUPABASE_DB_URL -c "
SELECT proconfig FROM pg_proc
WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;
"
# Expected: {search_path=''}

# 수동 작업: Password Protection 활성화
# https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers
# Settings → Auth → Password Protection → Enable
```

**예상 소요시간**: 5분
**롤백 난이도**: ⭐ 쉬움

---

#### 단계 2: 인덱스 추가 (권장) ✅

```bash
# Migration 002 실행
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_002_add_foreign_key_indexes.sql

# 검증
psql $SUPABASE_DB_URL -c "
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname IN (
  'idx_bookmarks_video_id',
  'idx_user_channels_channel_id',
  'idx_watch_history_video_id'
)
ORDER BY tablename;
"
# Expected: 3 rows
```

**예상 소요시간**: 2분
**롤백 난이도**: ⭐ 쉬움
**효과**: JOIN 쿼리 성능 향상

---

#### 단계 3: RLS 최적화 (고성능) ⚡

```bash
# Migration 003 실행
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_003_optimize_rls_policies.sql

# 검증: 최적화된 정책 수 확인
psql $SUPABASE_DB_URL -c "
SELECT COUNT(*) as optimized_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
  AND (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%');
"
# Expected: 18 policies

# 성능 테스트
psql $SUPABASE_DB_URL -c "
EXPLAIN ANALYZE
SELECT * FROM bookmarks
WHERE user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text);
"
# Look for 'InitPlan' in output - indicates optimization is working
```

**예상 소요시간**: 10분
**롤백 난이도**: ⭐ 쉬움
**효과**: 최대 99.78% 성능 개선

---

#### 단계 4: 정책 통합 (선택) ⚠️

**⚠️ 주의**: 이 단계는 선택사항입니다. 반드시 스테이징 환경에서 먼저 테스트하세요.

```bash
# Migration 004 실행 (테스트 환경에서 먼저!)
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_004_consolidate_duplicate_policies.sql

# 검증: 중복 정책 제거 확인
psql $SUPABASE_DB_URL -c "
SELECT tablename, cmd, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
"
# Expected: 0 rows (no duplicates)
```

**필수 테스트**:
```bash
# 권한 테스트 스크립트 실행
psql $SUPABASE_DB_URL <<EOF
-- 1. SELECT 테스트
SELECT COUNT(*) FROM bookmarks;

-- 2. INSERT 테스트
INSERT INTO user_settings (user_id, summary_level)
VALUES ((SELECT id FROM users WHERE google_id = auth.uid()::text), 2)
ON CONFLICT (user_id) DO UPDATE SET summary_level = 2;

-- 3. UPDATE 테스트
UPDATE user_settings SET summary_level = 3
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);

-- 4. DELETE 테스트
DELETE FROM bookmarks
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text)
  AND video_id = 'test-video-id';
EOF
```

**예상 소요시간**: 15분
**롤백 난이도**: ⭐⭐ 중간
**효과**: Policy 평가 횟수 감소, 유지보수성 향상

---

#### 단계 5: 인덱스 정리 (선택) 🧹

```bash
# Migration 005 실행
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_005_cleanup_unused_indexes.sql

# 검증: 인덱스 제거 확인
psql $SUPABASE_DB_URL -c "
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_websub_expiring',
    'idx_websub_failed',
    'idx_users_provider_token_expires'
  );
"
# Expected: 0 rows
```

**예상 소요시간**: 2분
**롤백 난이도**: ⭐ 쉬움
**효과**: 스토리지 절약, 유지보수 오버헤드 감소

---

## 📊 전체 실행 스크립트

### 보수적 접근 (프로덕션 권장)

```bash
#!/bin/bash
set -e

# 환경 변수 확인
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL not set"
  exit 1
fi

echo "🚀 Starting Supabase optimization migrations..."
echo ""

# Phase 1: Security (필수)
echo "📍 Phase 1: Security Fixes"
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_001_fix_security_issues.sql
echo "✅ Phase 1 completed"
echo ""
read -p "Press Enter to continue to Phase 2..."

# Phase 2: Indexes (권장)
echo "📍 Phase 2: Add Foreign Key Indexes"
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_002_add_foreign_key_indexes.sql
echo "✅ Phase 2 completed"
echo ""
read -p "Press Enter to continue to Phase 3..."

# Phase 3: RLS Optimization (권장)
echo "📍 Phase 3: RLS Policy Optimization"
psql $SUPABASE_DB_URL -f supabase/migrations/20250110_003_optimize_rls_policies.sql
echo "✅ Phase 3 completed"
echo ""
echo "⏸️  Recommended: Monitor for 7 days before proceeding to Phase 4"
read -p "Continue to Phase 4? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Stopping. Run Phase 4 and 5 manually when ready."
  exit 0
fi

# Phase 4: Policy Consolidation (선택)
echo "📍 Phase 4: Consolidate Duplicate Policies"
echo "⚠️  Warning: Test thoroughly before applying to production!"
read -p "Are you sure? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  psql $SUPABASE_DB_URL -f supabase/migrations/20250110_004_consolidate_duplicate_policies.sql
  echo "✅ Phase 4 completed"
else
  echo "Skipping Phase 4"
fi
echo ""

# Phase 5: Cleanup (선택)
echo "📍 Phase 5: Cleanup Unused Indexes"
read -p "Proceed with cleanup? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  psql $SUPABASE_DB_URL -f supabase/migrations/20250110_005_cleanup_unused_indexes.sql
  echo "✅ Phase 5 completed"
else
  echo "Skipping Phase 5"
fi

echo ""
echo "🎉 Migration completed!"
echo ""
echo "📝 Next steps:"
echo "1. Enable password protection in Dashboard"
echo "2. Monitor application performance"
echo "3. Run validation queries"
```

### 적극적 접근 (개발/스테이징)

```bash
#!/bin/bash
set -e

export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

echo "🚀 Running all migrations..."

psql $SUPABASE_DB_URL -f supabase/migrations/20250110_001_fix_security_issues.sql
echo "✅ Phase 1: Security"

psql $SUPABASE_DB_URL -f supabase/migrations/20250110_002_add_foreign_key_indexes.sql
echo "✅ Phase 2: Indexes"

psql $SUPABASE_DB_URL -f supabase/migrations/20250110_003_optimize_rls_policies.sql
echo "✅ Phase 3: RLS Optimization"

psql $SUPABASE_DB_URL -f supabase/migrations/20250110_004_consolidate_duplicate_policies.sql
echo "✅ Phase 4: Policy Consolidation"

psql $SUPABASE_DB_URL -f supabase/migrations/20250110_005_cleanup_unused_indexes.sql
echo "✅ Phase 5: Cleanup"

echo ""
echo "🎉 All migrations completed!"
```

---

## 🧪 종합 검증 스크립트

```bash
#!/bin/bash

echo "🔍 Running comprehensive validation..."
echo ""

# Phase 1 validation
echo "Phase 1: Security"
psql $SUPABASE_DB_URL -c "SELECT proconfig FROM pg_proc WHERE proname = 'handle_new_user';"
echo ""

# Phase 2 validation
echo "Phase 2: Indexes"
psql $SUPABASE_DB_URL -c "
SELECT tablename, indexname FROM pg_indexes
WHERE indexname LIKE 'idx_%' AND schemaname = 'public'
ORDER BY tablename;
"
echo ""

# Phase 3 validation
echo "Phase 3: RLS Optimization"
psql $SUPABASE_DB_URL -c "
SELECT
  tablename,
  COUNT(*) as optimized_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%')
GROUP BY tablename
ORDER BY tablename;
"
echo ""

# Phase 4 validation
echo "Phase 4: Policy Count"
psql $SUPABASE_DB_URL -c "
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
GROUP BY tablename
ORDER BY tablename;
"
echo ""

echo "✅ Validation complete!"
```

---

## 🔄 롤백 스크립트

```bash
#!/bin/bash

echo "⚠️  ROLLBACK MODE"
echo "This will revert all changes. Are you sure?"
read -p "Type 'ROLLBACK' to confirm: " confirmation

if [ "$confirmation" != "ROLLBACK" ]; then
  echo "Cancelled"
  exit 1
fi

# Rollback in reverse order
echo "Rolling back Phase 5..."
psql $SUPABASE_DB_URL <<EOF
CREATE INDEX CONCURRENTLY idx_websub_expiring
  ON channel_websub_subscriptions(hub_lease_expires_at) WHERE status = 'verified';
CREATE INDEX CONCURRENTLY idx_websub_failed
  ON channel_websub_subscriptions(last_subscribe_attempt_at) WHERE status = 'failed';
CREATE INDEX CONCURRENTLY idx_users_provider_token_expires
  ON users(provider_token_expires_at) WHERE provider_token IS NOT NULL;
EOF

echo "Rolling back Phase 4..."
# See 20250110_004_consolidate_duplicate_policies.sql for full rollback SQL

echo "Rolling back Phase 3..."
# Policies will need to be recreated with original patterns

echo "Rolling back Phase 2..."
psql $SUPABASE_DB_URL <<EOF
DROP INDEX CONCURRENTLY IF EXISTS idx_bookmarks_video_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_channels_channel_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_watch_history_video_id;
EOF

echo "Rolling back Phase 1..."
# See 20250110_001_fix_security_issues.sql for rollback SQL

echo "✅ Rollback complete"
```

---

## 📈 성능 모니터링

### 1. RLS 성능 확인

```sql
-- Before & After 비교
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bookmarks
WHERE user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text);
```

**최적화 성공 지표**:
- `InitPlan` 노드 존재
- Execution time 감소
- Fewer buffer reads

### 2. 인덱스 사용률 확인

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### 3. 느린 쿼리 분석

```sql
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%bookmarks%' OR query LIKE '%user_settings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🆘 문제 해결

### 이슈: 권한 오류 발생

```bash
# 1. 현재 사용자 확인
psql $SUPABASE_DB_URL -c "SELECT current_user;"

# 2. RLS 정책 확인
psql $SUPABASE_DB_URL -c "
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookmarks';
"
```

### 이슈: 성능 저하 감지

```bash
# 1. 쿼리 플랜 확인
psql $SUPABASE_DB_URL -c "EXPLAIN ANALYZE [YOUR_QUERY];"

# 2. 인덱스 사용 확인
psql $SUPABASE_DB_URL -c "
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public';
"

# 3. 필요시 롤백
# See rollback script above
```

---

## 📞 지원

문제 발생시:
1. 각 마이그레이션 파일의 "ROLLBACK" 섹션 참조
2. Supabase Dashboard → Logs 확인
3. 백업에서 복구

---

**작성일**: 2025-01-10
**버전**: 1.0.0
