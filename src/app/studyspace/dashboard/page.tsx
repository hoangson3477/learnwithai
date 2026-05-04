'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Brain,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  Target,
  Upload,
  Link,
  FileText,
  Plus,
  Flame,
  Network,
} from 'lucide-react';

interface StudySpace {
  id: string;
  name: string;
  theme: string;
  icon: string;
  goal: string;
}

interface FlashcardStats {
  totalFlashcards: number;
  dueCards: number;
  totalConcepts: number;
  masteredConcepts: number;
  averageMastery: number;
  todayReviews: number;
  streak: number;
}

export default function StudySpaceDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [studySpace, setStudySpace] = useState<StudySpace | null>(null);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStudySpace();
      fetchFlashcardStats();
    }
  }, [user?.id]);

  const fetchStudySpace = async () => {
    try {
      const response = await fetch(`/api/studyspace?userId=${user?.id}`);
      const data = await response.json();
      if (data.success && data.studySpace) {
        setStudySpace(data.studySpace);
      }
    } catch (error) {
      console.error('Error fetching study space:', error);
    }
  };

  const fetchFlashcardStats = async () => {
    try {
      const response = await fetch(`/api/flashcards/stats?userId=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching flashcard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThemeGradient = (theme: string) => {
    return `bg-gradient-to-r ${theme}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className={`${studySpace ? getThemeGradient(studySpace.theme) : 'bg-gradient-to-r from-indigo-500 to-purple-600'} text-white`}>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl">
              <LayoutDashboard className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {studySpace?.name || 'Không Gian Học Tập'}
              </h1>
              <p className="text-white/80 mt-1">
                {studySpace?.goal || 'Học tập hiệu quả với AI'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-slate-600">Cần ôn tập</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats?.dueCards || 0}</p>
            <p className="text-xs text-slate-500 mt-1">flashcards</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span className="text-sm text-slate-600">Tổng Flashcards</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats?.totalFlashcards || 0}</p>
            <p className="text-xs text-slate-500 mt-1">đã tạo</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-600">Thành thạo</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {stats?.masteredConcepts || 0}/{stats?.totalConcepts || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">concepts</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-red-500" />
              <span className="text-sm text-slate-600">Streak</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats?.streak || 0}</p>
            <p className="text-xs text-slate-500 mt-1">ngày liên tiếp</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="md:col-span-2 space-y-6">
            {/* Continue Learning */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Tiếp tục học tập
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/flashcards')}
                  className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500 rounded-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">Flashcards</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {stats?.dueCards ? `${stats.dueCards} cards cần ôn tập` : 'Ôn tập với spaced repetition'}
                  </p>
                </button>

                <button
                  onClick={() => router.push('/lessons')}
                  className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">Bài học</span>
                  </div>
                  <p className="text-sm text-slate-600">Tiếp tục khóa học của bạn</p>
                </button>

                <button
                  onClick={() => router.push('/quiz')}
                  className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">Quiz</span>
                  </div>
                  <p className="text-sm text-slate-600">Kiểm tra kiến thức</p>
                </button>

                <button
                  onClick={() => router.push('/chat')}
                  className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">AI Tutor</span>
                  </div>
                  <p className="text-sm text-slate-600">Hỏi & đáp với AI</p>
                </button>

                <button
                  onClick={() => router.push('/mindmaps')}
                  className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-pink-500 rounded-lg">
                      <Network className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">Mind Maps</span>
                  </div>
                  <p className="text-sm text-slate-600">Visualize mối liên hệ concepts</p>
                </button>
              </div>
            </div>

            {/* Concept Mastery */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Concept Mastery
              </h2>
              {stats?.averageMastery ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600">Mức độ thành thạo trung bình</span>
                    <span className="text-2xl font-bold text-indigo-600">{stats.averageMastery}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${stats.averageMastery}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  Bắt đầu tạo flashcards để theo dõi tiến độ!
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Upload & Create */}
          <div className="space-y-6">
            {/* Get Started */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Bắt đầu</h2>
              <div className="space-y-3">
                <button className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">Upload</p>
                      <p className="text-xs text-slate-500">PDF, PowerPoint, Audio</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Link className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">Link</p>
                      <p className="text-xs text-slate-500">YouTube, Website</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">Paste</p>
                      <p className="text-xs text-slate-500">Notes, Text</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Today's Progress */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Tiến độ hôm nay</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Flashcards đã ôn</span>
                  <span className="font-bold">{stats?.todayReviews || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Streak</span>
                  <span className="font-bold flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    {stats?.streak || 0} ngày
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push('/flashcards')}
                className="w-full mt-4 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                {stats?.dueCards ? 'Ôn tập ngay' : 'Tạo flashcards'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
