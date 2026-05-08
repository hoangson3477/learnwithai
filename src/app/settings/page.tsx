'use client';

import { useState, useEffect } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useStudyReminders } from '@/hooks/useStudyReminders';
import { 
  Bell, 
  BellOff, 
  Calendar, 
  Clock, 
  Target, 
  BarChart3,
  Save,
  Check,
  X
} from 'lucide-react';

function SettingsPage() {
  const { 
    settings, 
    isEnabled, 
    saveSettings, 
    requestPermission, 
    toggleReminders,
    updateSetting 
  } = useStudyReminders();

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    const enabled = await toggleReminders(!isEnabled);
    if (!enabled) {
      // Show permission denied message
      alert('Vui lòng cho phép thông báo trong trình duyệt để sử dụng tính năng này.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8" />
            <span>Cài đặt nhắc nhở</span>
          </h1>
          <p className="text-indigo-100">Tùy chỉnh thông báo học tập để giữ động lực</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Đã lưu cài đặt thành công!</span>
          </div>
        )}

        {/* Notification Permission */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>Quyền thông báo</span>
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-800 mb-1">Thông báo đẩy</p>
              <p className="text-sm text-slate-600">
                {isEnabled ? 'Đã bật' : 'Đã tắt'} - Nhận thông báo học tập
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                isEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isEnabled ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>Tắt thông báo</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Bật thông báo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Daily Reminder */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Nhắc nhở hàng ngày</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Nhắc nhở học hàng ngày</p>
                <p className="text-sm text-slate-600">Nhận thông báo vào thời gian cố định mỗi ngày</p>
              </div>
              <button
                onClick={() => updateSetting('dailyReminder', !settings.dailyReminder)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dailyReminder ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dailyReminder ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.dailyReminder && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800">Thời gian nhắc nhở</p>
                  <p className="text-sm text-slate-600">Giờ nhận thông báo hàng ngày</p>
                </div>
                <input
                  type="time"
                  value={settings.dailyTime}
                  onChange={(e) => updateSetting('dailyTime', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Study Goal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            <span>Mục tiêu học tập</span>
          </h2>
          
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Mục tiêu hàng ngày</p>
                <p className="text-sm text-slate-600">Số phút học mục tiêu mỗi ngày</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={settings.studyGoalMinutes}
                  onChange={(e) => updateSetting('studyGoalMinutes', parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                />
                <span className="text-slate-600">phút</span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Reminder */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <span>Nhắc nhở chuỗi</span>
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Nhắc nhở chuỗi học tập</p>
              <p className="text-sm text-slate-600">Thông báo khi sắp mất chuỗi</p>
            </div>
            <button
              onClick={() => updateSetting('streakReminder', !settings.streakReminder)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.streakReminder ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.streakReminder ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Weekly Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>Báo cáo tuần</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Báo cáo học tập tuần</p>
                <p className="text-sm text-slate-600">Nhận báo cáo tổng kết tuần</p>
              </div>
              <button
                onClick={() => updateSetting('weeklyReport', !settings.weeklyReport)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.weeklyReport ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.weeklyReport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.weeklyReport && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="font-medium text-slate-800 mb-2">Ngày gửi báo cáo</p>
                <select
                  value={settings.weeklyDay}
                  onChange={(e) => updateSetting('weeklyDay', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>Chủ Nhật</option>
                  <option value={1}>Thứ Hai</option>
                  <option value={2}>Thứ Ba</option>
                  <option value={3}>Thứ Tư</option>
                  <option value={4}>Thứ Năm</option>
                  <option value={5}>Thứ Sáu</option>
                  <option value={6}>Thứ Bảy</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cài đặt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPageWrapper() {
  return (
    <ProtectedPageWrapper>
      <SettingsPage />
    </ProtectedPageWrapper>
  );
}

export default SettingsPageWrapper;
