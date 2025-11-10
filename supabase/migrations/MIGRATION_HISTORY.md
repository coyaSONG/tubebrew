# TubeBrew Migration History

실제 실행된 마이그레이션 이력을 기록합니다.

## 📅 2025-11-10

### 20251110085153_remove_duplicate_rls_policies

**목적**: 중복 RLS policies 제거로 성능 최적화

**변경 내역**:
- ❌ 제거: `"Users can view own bookmarks"` (bookmarks 테이블)
- ❌ 제거: `"Users can view own channels"` (user_channels 테이블)
- ❌ 제거: `"Users can insert own settings"` (user_settings 테이블)
- ❌ 제거: `"Users can insert own data"` (users 테이블)
- ❌ 제거: `"Users can view own history"` (watch_history 테이블)

**영향**:
- 각 테이블에서 4개 role (anon, authenticated, authenticator, dashboard_user)별로 적용
- **총 20개 중복 정책 제거**

**결과**:
- ✅ Supabase Linter 경고 20건 → 0건
- ✅ 모든 CRUD 작업 정상 동작 확인
- ✅ RLS 정책 성능 개선

**검증 완료**:
```sql
-- SELECT 쿼리: bookmarks, user_channels, watch_history (FOR ALL policy 커버)
-- INSERT 쿼리: user_settings, users (FOR INSERT policy 유지)
-- UPDATE 쿼리: 모든 테이블 정상
-- DELETE 쿼리: 모든 테이블 정상
```

**Rollback**: 필요시 각 policy를 다시 생성하면 됨 (마이그레이션 파일 참조)

---

### 20251110083700_optimize_rls_policies

**목적**: RLS policy 쿼리 최적화

**변경 내역**:
- RLS policies에서 `auth.uid()` 호출 최적화
- InitPlan을 사용한 쿼리 플랜 개선

**결과**:
- ✅ 쿼리 성능 대폭 향상

---

### 20251110083627_add_foreign_key_indexes

**목적**: Foreign key 컬럼 인덱스 추가

**변경 내역**:
- `idx_bookmarks_video_id` 추가
- `idx_user_channels_channel_id` 추가
- `idx_watch_history_video_id` 추가

**결과**:
- ✅ JOIN 쿼리 성능 향상

---

### 20251110083555_fix_security_issues

**목적**: 보안 취약점 수정

**변경 내역**:
- Function `search_path` 보안 설정

**결과**:
- ✅ 보안 이슈 해결

---

## 📅 2025-11-02

### 20251102075952_add_user_settings_insert_policy

**목적**: user_settings 테이블 INSERT policy 추가

---

### 20251102031643_add_websub_subscriptions

**목적**: WebSub 구독 관리 테이블 생성

---

## 📅 2025-11-01

### 20251101164037_add_provider_token

**목적**: OAuth 토큰 저장 필드 추가

---

### 20251101133350_create_user_on_signup_trigger

**목적**: 회원가입 시 자동 user 레코드 생성

---

### 20251101130608_fix_rls_policies_for_supabase_auth

**목적**: Supabase Auth용 초기 RLS policies

---

### 20251101130500_fix_function_search_path_security

**목적**: Function 보안 search_path 수정

---

## 📊 통계

**총 마이그레이션 수**: 10개
**마지막 실행**: 2025-11-10
**현재 데이터베이스 버전**: 1.1

**해결된 이슈**:
- 보안 이슈: 1/2 (50%) - 1건은 수동 설정 필요 (Leaked Password Protection)
- 성능 이슈: 34/34 (100%)
- 총계: 35/36 (97.2%)

---

**작성일**: 2025-11-10
**작성자**: TubeBrew Development Team
