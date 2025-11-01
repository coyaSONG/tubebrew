'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const errors: Record<string, string> = {
  Configuration: '서버 설정 오류가 발생했습니다.',
  AccessDenied: '액세스가 거부되었습니다.',
  Verification: '인증 토큰이 만료되었거나 이미 사용되었습니다.',
  Default: '로그인 중 오류가 발생했습니다.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const errorMessage = error && errors[error] ? errors[error] : errors.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            로그인 오류
          </h1>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            다시 로그인하기
          </Link>

          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-semibold">에러 코드:</p>
            <p className="mt-1 font-mono">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">로딩 중...</h1>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
