'use client';

import { useState, useEffect } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAchievements } from '@/hooks/useAchievements';
import { 
  Trophy, 
  Target, 
  Flame, 
  BookOpen, 
  MessageCircle, 
  Star,
  Lock,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

const categoryIcons = {
  learning: BookOpen,
  streak: Flame,
  quiz: Target,
  social: MessageCircle,
  milestone: Trophy,
};

const categoryColors = {
  learning: 'text-blue-600 bg-blue-50 border-blue-200',
  streak: 'text-orange-600 bg-orange-50 border-orange-200',
  quiz: 'text-green-600 bg-green-50 border-green-200',
  social: 'text-purple-600 bg-purple-50 border-purple-200',
  milestone: 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

function AchievementsPage() {
  const { 
    unlockedAchievements, 
    availableAchievements, 
    totalPoints,
    getAchievementsByCategory 
  } = useAchievements();

  const [activeTab, setActiveTab] = useState<'all' | 'learning' | 'streak' | 'quiz' | 'social' | 'milestone'>('all');

  const categories = [
    { id: 'all', name: 'Tất cả', icon: Trophy },
    { id: 'learning', name: 'Học tập', icon: BookOpen },
    { id: 'streak', name: 'Chuỗi', icon: Flame },
    { id: 'quiz', name: 'Quiz', icon: Target },
    { id: 'social', name: 'Xã hội', icon: MessageCircle },
    { id: 'milestone', name: 'Cột mốc', icon: Star },
  ];

  const getFilteredAchievements = () => {
    if (activeTab === 'all') {
      return {
        unlocked: unlockedAchievements,
        available: availableAchievements,
      };
    }
    return getAchievementsByCategory(activeTab);
  };

  const filtered = getFilteredAchievements();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Thành tựu</h1>
              <p className="text-indigo-100">Theo dõi tiến độ và mở khóa thành tựu mới</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{totalPoints}</div>
              <div className="text-indigo-100 text-sm">Điểm tổng</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === category.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
                {category.id !== 'all' && (
                  <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {getAchievementsByCategory(category.id as any).unlocked.length}/
                    {getAchievementsByCategory(category.id as any).unlocked.length + getAchievementsByCategory(category.id as any).available.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{unlockedAchievements.length}</div>
                <div className="text-slate-500 text-sm">Đã mở khóa</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{availableAchievements.length}</div>
                <div className="text-slate-500 text-sm">Còn lại</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {Math.round((unlockedAchievements.length / (unlockedAchievements.length + availableAchievements.length)) * 100)}%
                </div>
                <div className="text-slate-500 text-sm">Tiến độ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="space-y-8">
          {/* Unlocked Achievements */}
          {filtered.unlocked.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span>Đã mở khóa ({filtered.unlocked.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.unlocked.map((achievement) => {
                  const Icon = categoryIcons[achievement.category];
                  return (
                    <div
                      key={achievement.id}
                      className={`bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 hover:shadow-md transition-all duration-200`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium mb-2 ${categoryColors[achievement.category]}`}>
                            <Icon className="w-3 h-3" />
                            <span>{achievement.category}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">{achievement.name}</h3>
                          <p className="text-slate-600 text-sm mb-3">{achievement.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-green-600 font-semibold">+{achievement.points} điểm</span>
                            {achievement.unlocked_at && (
                              <span className="text-slate-500 text-xs">
                                {new Date(achievement.unlocked_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Achievements */}
          {filtered.available.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Lock className="w-6 h-6 text-orange-600" />
                <span>Chưa mở khóa ({filtered.available.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.available.map((achievement) => {
                  const Icon = categoryIcons[achievement.category];
                  return (
                    <div
                      key={achievement.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 opacity-75"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl grayscale">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium mb-2 ${categoryColors[achievement.category]}`}>
                            <Icon className="w-3 h-3" />
                            <span>{achievement.category}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">{achievement.name}</h3>
                          <p className="text-slate-600 text-sm mb-3">{achievement.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">+{achievement.points} điểm</span>
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filtered.unlocked.length === 0 && filtered.available.length === 0 && (
            <div className="text-center py-12">
              <div className="p-4 bg-slate-100 rounded-xl w-fit mx-auto mb-4">
                <Trophy className="w-16 h-16 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Chưa có thành tựu nào</h3>
              <p className="text-slate-500">Học tập và hoàn thành các hoạt động để mở khóa thành tựu!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPageWrapper() {
  return (
    <ProtectedPageWrapper>
      <AchievementsPage />
    </ProtectedPageWrapper>
  );
}
