'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

interface UserSettings {
  userId: string;
  summaryLevel: number;
  notificationType: string;
  notificationTime: string;
  youtubeSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    summaryLevel: 2,
    notificationType: 'daily',
    notificationTime: '08:00:00',
    youtubeSyncEnabled: true,
  });

  // 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
      }

      setSettings(data.data);
      setFormData({
        summaryLevel: data.data.summaryLevel,
        notificationType: data.data.notificationType,
        notificationTime: data.data.notificationTime,
        youtubeSyncEnabled: data.data.youtubeSyncEnabled,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSettings(data.data);
      toast.success('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 lg:py-8 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-gray-900" />
          <h1 className="text-3xl font-bold text-gray-900">설정</h1>
        </div>
        <p className="text-gray-600">
          TubeBrew의 동작 방식을 커스터마이즈하세요.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 요약 레벨 설정 */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              요약 레벨
            </h2>
            <p className="text-sm text-gray-600">
              비디오 요약의 상세 정도를 선택하세요.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                level: 1,
                name: '간단',
                description: '핵심만 빠르게 파악 (1-2문장)',
              },
              {
                level: 2,
                name: '보통',
                description: '주요 내용을 요약 (2-3문단)',
              },
              {
                level: 3,
                name: '상세',
                description: '상세한 내용 포함 (4-5문단)',
              },
              {
                level: 4,
                name: '완전',
                description: '모든 내용을 상세히 (6문단 이상)',
              },
            ].map((option) => (
              <label
                key={option.level}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.summaryLevel === option.level
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="summaryLevel"
                  value={option.level}
                  checked={formData.summaryLevel === option.level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      summaryLevel: parseInt(e.target.value),
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {option.name} (레벨 {option.level})
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* 알림 설정 */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              알림 설정
            </h2>
            <p className="text-sm text-gray-600">
              새 영상 알림 방식을 설정하세요.
            </p>
          </div>

          <div className="space-y-4">
            {/* 알림 타입 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                알림 주기
              </label>
              <select
                value={formData.notificationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationType: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">알림 없음</option>
                <option value="instant">즉시 알림</option>
                <option value="daily">일일 요약</option>
                <option value="weekly">주간 요약</option>
              </select>
            </div>

            {/* 알림 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                알림 시간
              </label>
              <input
                type="time"
                value={formData.notificationTime.slice(0, 5)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationTime: e.target.value + ':00',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                일일/주간 요약을 받을 시간을 설정하세요.
              </p>
            </div>
          </div>
        </Card>

        {/* YouTube 동기화 설정 */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              YouTube 동기화
            </h2>
            <p className="text-sm text-gray-600">
              YouTube 구독 채널을 자동으로 동기화합니다.
            </p>
          </div>

          <label className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
            <div>
              <div className="font-medium text-gray-900">
                자동 동기화 활성화
              </div>
              <div className="text-sm text-gray-600">
                YouTube 구독 채널의 새 영상을 자동으로 가져옵니다.
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.youtubeSyncEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  youtubeSyncEnabled: e.target.checked,
                })
              }
              className="w-5 h-5"
            />
          </label>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={fetchSettings}
            disabled={saving}
          >
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                저장
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 채널 재설정 */}
      <Card className="p-6 border-destructive/50">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            채널 재설정
          </h2>
          <p className="text-sm text-gray-600">
            구독 채널을 다시 선택하고 분류할 수 있습니다.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            • 현재 설정된 채널들이 유지됩니다
            <br />
            • 새로운 구독 채널이 추가되거나 기존 채널의 카테고리를 변경할 수 있습니다
            <br />• AI가 자동으로 채널을 분류해드립니다
          </p>

          <Button
            variant="destructive"
            onClick={() => (window.location.href = '/onboarding')}
          >
            채널 재설정 시작
          </Button>
        </div>
      </Card>
    </div>
  );
}
