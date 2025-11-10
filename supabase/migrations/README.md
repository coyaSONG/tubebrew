# Supabase Database Optimization Migrations

본 마이그레이션 세트는 Supabase Database Linter가 감지한 36개의 이슈를 해결하기 위한 5단계 최적화 계획입니다.

## 📋 개요

- **총 이슈**: 36개
- **보안 이슈**: 2개
- **성능 이슈**: 34개
- **예상 성능 개선**: 최대 99.78% (Supabase 공식 문서 기준)

## 🚀 마이그레이션 파일

### Phase 1: Security Fixes (필수)
**파일**: `20250110_001_fix_security_issues.sql`
- ✅ Function search_path 보안 취약점 수정
- ✅ Password protection 활성화 안내

**위험도**: ⚠️ LOW | **소요시간**: 5분 | **롤백**: 쉬움

### Phase 2: Add Foreign Key Indexes (권장)
**파일**: `20250110_002_add_foreign_key_indexes.sql`
- ✅ 3개 테이블 foreign key 인덱스 추가
- ✅ JOIN 쿼리 성능 향상

**위험도**: ⚠️ LOW | **소요시간**: 2분 | **롤백**: 쉬움

### Phase 3: RLS Policy Optimization (고성능)
**파일**: `20250110_003_optimize_rls_policies.sql`
- ✅ 18개 RLS 정책 최적화
- ✅ auth.uid() 호출 캐싱으로 성능 대폭 개선

**위험도**: ⚠️ LOW | **소요시간**: 10분 | **롤백**: 쉬움

### Phase 4: Policy Consolidation (선택)
**파일**: `20250110_004_consolidate_duplicate_policies.sql`
- ⚠️ 16개 중복 정책 제거
- ⚠️ 철저한 테스트 필요

**위험도**: ⚠️ MEDIUM | **소요시간**: 15분 | **롤백**: 중간

### Phase 5: Cleanup Unused Indexes (선택)
**파일**: `20250110_005_cleanup_unused_indexes.sql`
- 🧹 3개 미사용 인덱스 제거
- 🧹 스토리지 최적화

**위험도**: ⚠️ LOW | **소요시간**: 2분 | **롤백**: 쉬움

## 📊 실행 권장 순서

### 시나리오 A: 보수적 접근 (프로덕션)

```bash
# Week 1: Security & Quick Wins
Phase 1: Security Fixes (필수)
Phase 2: Add Indexes (권장)
→ 모니터링 7일

# Week 2: Performance Optimization
Phase 3: RLS Optimization (권장)
→ 모니터링 7일

# Week 3: Consolidation (선택)
Phase 4: Policy Consolidation (테스트 후 적용)
→ 모니터링 7일

# Week 4: Cleanup (선택)
Phase 5: Unused Index Cleanup
```

### 시나리오 B: 적극적 접근 (개발/스테이징)

```bash
# Day 1: 전체 실행
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
→ 종합 테스트 및 성능 모니터링
```

## 🔧 실행 방법

### Supabase CLI 사용

```bash
# 1. Phase 1 실행 (보안 수정)
supabase db push --db-url "postgresql://..." \
  supabase/migrations/20250110_001_fix_security_issues.sql

# 2. Phase 2 실행 (인덱스 추가)
supabase db push --db-url "postgresql://..." \
  supabase/migrations/20250110_002_add_foreign_key_indexes.sql

# 3. Phase 3 실행 (RLS 최적화)
supabase db push --db-url "postgresql://..." \
  supabase/migrations/20250110_003_optimize_rls_policies.sql

# 4. Phase 4 실행 (정책 통합 - 선택)
supabase db push --db-url "postgresql://..." \
  supabase/migrations/20250110_004_consolidate_duplicate_policies.sql

# 5. Phase 5 실행 (정리 - 선택)
supabase db push --db-url "postgresql://..." \
  supabase/migrations/20250110_005_cleanup_unused_indexes.sql
```

### Supabase Dashboard 사용

1. Dashboard → SQL Editor 이동
2. 각 마이그레이션 파일 내용 복사
3. SQL 실행
4. 검증 쿼리 결과 확인

## ✅ 검증 체크리스트

### Phase 1 검증
```sql
-- search_path 설정 확인
SELECT proconfig FROM pg_proc WHERE proname = 'handle_new_user';
-- Expected: {search_path=''}
```

### Phase 2 검증
```sql
-- 인덱스 생성 확인
SELECT indexname FROM pg_indexes
WHERE indexname IN (
  'idx_bookmarks_video_id',
  'idx_user_channels_channel_id',
  'idx_watch_history_video_id'
);
-- Expected: 3 rows
```

### Phase 3 검증
```sql
-- RLS 정책 최적화 확인
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%');
-- Expected: 18 policies
```

### Phase 4 검증 (선택)
```sql
-- 중복 정책 제거 확인
SELECT tablename, cmd, COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

### Phase 5 검증 (선택)
```sql
-- 인덱스 제거 확인
SELECT indexname FROM pg_indexes
WHERE indexname IN ('idx_websub_expiring', 'idx_websub_failed', 'idx_users_provider_token_expires');
-- Expected: 0 rows
```

## 🧪 테스트 가이드

### Phase 4 테스트 (필수)

```sql
-- 1. SELECT 권한 테스트
SELECT * FROM bookmarks
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);
-- ✅ 자신의 데이터만 조회되어야 함

-- 2. INSERT 권한 테스트
INSERT INTO user_settings (user_id, summary_level)
VALUES ((SELECT id FROM users WHERE google_id = auth.uid()::text), 2);
-- ✅ 성공해야 함

-- 3. UPDATE 권한 테스트
UPDATE user_settings SET summary_level = 3
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);
-- ✅ 성공해야 함

-- 4. DELETE 권한 테스트
DELETE FROM bookmarks
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);
-- ✅ 성공해야 함

-- 5. 다른 사용자 데이터 접근 차단 확인
SELECT * FROM bookmarks WHERE user_id != (SELECT id FROM users WHERE google_id = auth.uid()::text);
-- ✅ 0 rows 반환되어야 함
```

## 📈 성능 모니터링

### RLS 성능 확인
```sql
EXPLAIN ANALYZE
SELECT * FROM bookmarks
WHERE user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text);

-- "InitPlan" 노드 확인 - 최적화 성공 지표
```

### 인덱스 사용 확인
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

## 🔄 롤백 가이드

각 마이그레이션 파일에는 롤백 SQL이 포함되어 있습니다.

### 롤백 순서 (역순으로 실행)
```bash
# Phase 5 롤백 (인덱스 재생성)
# Phase 4 롤백 (정책 복원)
# Phase 3 롤백 (RLS 최적화 제거)
# Phase 2 롤백 (인덱스 제거)
# Phase 1 롤백 (함수 복원)
```

**중요**: 각 마이그레이션 파일 하단의 "ROLLBACK" 섹션 참조

## ⚠️ 주의사항

1. **백업 필수**
   - 각 Phase 실행 전 Database Snapshot 생성
   - Dashboard → Database → Backups

2. **Phase 4는 선택사항**
   - 철저한 테스트 없이 프로덕션 적용 금지
   - 스테이징 환경에서 먼저 검증

3. **모니터링**
   - 각 Phase 후 애플리케이션 동작 확인
   - 쿼리 성능 모니터링 (EXPLAIN ANALYZE)
   - 사용자 권한 정상 작동 확인

4. **Phase 1 수동 작업**
   - Password protection은 Dashboard에서 수동 활성화 필요
   - [Dashboard → Auth → Providers](https://supabase.com/dashboard)

## 📞 문제 해결

### 이슈 발생시
1. 해당 Phase의 롤백 SQL 실행
2. 애플리케이션 로그 확인
3. Supabase Dashboard → Logs 확인
4. 필요시 백업에서 복구

### 성능 저하 감지시
1. `EXPLAIN ANALYZE`로 쿼리 플랜 확인
2. `pg_stat_user_indexes`로 인덱스 사용 확인
3. `pg_stat_statements`로 느린 쿼리 분석

## 📚 참고 자료

- [Supabase RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Function Security](https://supabase.com/docs/guides/database/functions)

## 📝 변경 이력

- **2025-01-10**: Initial migration set created
  - Phase 1: Security fixes
  - Phase 2: Foreign key indexes
  - Phase 3: RLS optimization
  - Phase 4: Policy consolidation (optional)
  - Phase 5: Unused index cleanup (optional)

---

**작성일**: 2025-01-10
**작성자**: Claude Code with SuperClaude Framework
**버전**: 1.0.0
