'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { 
  LayoutDashboard, 
  Palette, 
  Target, 
  Calendar, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  X,
  Check
} from 'lucide-react';

const THEME_COLORS = [
  { name: 'Ocean Blue', value: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  { name: 'Purple Dream', value: 'from-purple-500 to-pink-500', bg: 'bg-purple-500' },
  { name: 'Green Nature', value: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  { name: 'Sunset Orange', value: 'from-orange-500 to-red-500', bg: 'bg-orange-500' },
  { name: 'Slate Modern', value: 'from-slate-600 to-slate-800', bg: 'bg-slate-600' },
];

const STUDY_ICONS = [
  { name: 'Book', icon: BookOpen, value: 'book' },
  { name: 'Target', icon: Target, value: 'target' },
  { name: 'Sparkles', icon: Sparkles, value: 'sparkles' },
  { name: 'Calendar', icon: Calendar, value: 'calendar' },
];

export default function StudySpacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [studySpace, setStudySpace] = useState({
    name: '',
    theme: THEME_COLORS[0].value,
    icon: STUDY_ICONS[0].value,
    goal: '',
  });

  const handleSkip = () => {
    router.push('/setup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/studyspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ...studySpace,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create study space');
      }

      router.push('/setup');
    } catch (error) {
      console.error('Error creating study space:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Tạo Không Gian Học Tập Cá Nhân</h1>
          <p className="text-slate-600 text-lg">Tùy chỉnh không gian học tập của bạn để trải nghiệm tốt nhất</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tên không gian */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Tên không gian học tập
            </label>
            <input
              type="text"
              value={studySpace.name}
              onChange={(e) => setStudySpace({ ...studySpace, name: e.target.value })}
              className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg"
              placeholder="Ví dụ: Không gian học Toán, English Corner..."
            />
          </div>

          {/* Chọn màu chủ đề - Cards */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Chọn màu chủ đề
            </label>
            <div className="grid grid-cols-5 gap-4">
              {THEME_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setStudySpace({ ...studySpace, theme: color.value })}
                  className={`relative h-24 rounded-2xl bg-gradient-to-br ${color.value} transition-all hover:scale-105 hover:shadow-lg ${
                    studySpace.theme === color.value ? 'ring-4 ring-offset-2 ring-indigo-500 shadow-lg' : 'shadow-md'
                  }`}
                  title={color.name}
                >
                  {studySpace.theme === color.value && (
                    <Check className="absolute inset-0 m-auto w-8 h-8 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn icon - Cards */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Chọn icon
            </label>
            <div className="grid grid-cols-4 gap-4">
              {STUDY_ICONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStudySpace({ ...studySpace, icon: item.value })}
                    className={`h-20 rounded-2xl border-2 transition-all hover:scale-105 flex items-center justify-center ${
                      studySpace.icon === item.value
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                    title={item.name}
                  >
                    <Icon className={`w-8 h-8 ${
                      studySpace.icon === item.value ? 'text-indigo-600' : 'text-slate-500'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mục tiêu học tập */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Mục tiêu học tập (tùy chọn)
            </label>
            <textarea
              value={studySpace.goal}
              onChange={(e) => setStudySpace({ ...studySpace, goal: e.target.value })}
              className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-lg"
              rows={3}
              placeholder="Ví dụ: Hoàn thành 10 bài học trong tháng, đạt 90% điểm quiz..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-semibold text-lg"
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={loading || !studySpace.name}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:shadow-xl transition-all font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <span>Tạo không gian</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Preview */}
        {studySpace.name && (
          <div className="mt-8 pt-8 border-t-2 border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-4">Xem trước:</p>
            <div className={`p-6 rounded-2xl bg-gradient-to-r ${studySpace.theme} text-white shadow-xl`}>
              <div className="flex items-center gap-4">
                {STUDY_ICONS.find(i => i.value === studySpace.icon)?.icon && (
                  <div className="p-3 bg-white/20 rounded-xl">
                    {React.createElement(STUDY_ICONS.find(i => i.value === studySpace.icon)!.icon, { className: 'w-8 h-8' })}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-xl">{studySpace.name}</h3>
                  {studySpace.goal && <p className="text-base text-white/90 mt-1">{studySpace.goal}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
