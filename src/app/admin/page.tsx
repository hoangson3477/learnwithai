'use client';

import { useState, useEffect } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { logger } from '@/lib/logger';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Trophy, 
  BarChart3, 
  Settings, 
  FileText,
  Activity,
  TrendingUp,
  UserCheck,
  Clock,
  Star
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalLessons: number;
  totalQuizzes: number;
  totalMessages: number;
  totalAchievements: number;
  avgStudyTime: number;
  weeklyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'lesson_completion' | 'quiz_completion' | 'achievement_unlock';
  user_email: string;
  description: string;
  created_at: string;
}

interface TopUser {
  id: string;
  email: string;
  total_points: number;
  current_level: number;
  streak_count: number;
  total_study_days: number;
}

function AdminContent() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalLessons: 0,
    totalQuizzes: 0,
    totalMessages: 0,
    totalAchievements: 0,
    avgStudyTime: 0,
    weeklyGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'analytics'>('overview');

  // Check if user is admin
  useEffect(() => {
    if (profile?.role !== 'web_admin') {
      window.location.href = '/dashboard';
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'web_admin') {
      fetchAdminData();
    }
  }, [profile?.role]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch basic stats
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalLessons },
        { count: totalQuizzes },
        { count: totalMessages },
        { count: totalAchievements }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_study_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('chat_history').select('*', { count: 'exact', head: true }),
        supabase.from('user_achievements').select('*', { count: 'exact', head: true }),
      ]);

      // Calculate average study time and weekly growth
      const { data: studyEvents } = await supabase
        .from('learning_events')
        .select('metadata')
        .eq('event_type', 'study_session')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const avgStudyTime = studyEvents?.reduce((sum, event) => {
        return sum + (event.metadata?.duration || 0);
      }, 0) / (studyEvents?.length || 1);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count: usersWeekAgo } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', weekAgo.toISOString());

      const weeklyGrowth = ((totalUsers - (usersWeekAgo || 0)) / (usersWeekAgo || 1)) * 100;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalLessons: totalLessons || 0,
        totalQuizzes: totalQuizzes || 0,
        totalMessages: totalMessages || 0,
        totalAchievements: totalAchievements || 0,
        avgStudyTime: Math.round(avgStudyTime),
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
      });

      // Fetch recent activity
      const { data: activities } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(activities || []);

      // Fetch top users
      const { data: topUsersData } = await supabase
        .from('users')
        .select('id, email, total_points, current_level, streak_count, total_study_days')
        .order('total_points', { ascending: false })
        .limit(10);

      setTopUsers(topUsersData || []);

    } catch (error) {
      logger.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (profile?.role !== 'web_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <span>Admin Panel</span>
          </h1>
          <p className="text-indigo-100">Quản lý hệ thống LearnWithAI</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
          {[
            { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'content', label: 'Nội dung', icon: FileText },
            { id: 'analytics', label: 'Phân tích', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
                    <p className="text-slate-500 text-sm">Tổng người dùng</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.activeUsers}</p>
                    <p className="text-slate-500 text-sm">Người dùng tích cực</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalLessons}</p>
                    <p className="text-slate-500 text-sm">Tổng bài học</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Trophy className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalAchievements}</p>
                    <p className="text-slate-500 text-sm">Thành tựu mở khóa</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <Clock className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.avgStudyTime} phút</p>
                    <p className="text-slate-600 text-sm">Thời gian học trung bình</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">+{stats.weeklyGrowth}%</p>
                    <p className="text-slate-600 text-sm">Tăng trưởng tuần</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalMessages}</p>
                    <p className="text-slate-600 text-sm">Tổng tin nhắn</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>Hoạt động gần đây</span>
              </h3>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Chưa có hoạt động nào</p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          {activity.type === 'user_signup' && <Users className="w-4 h-4 text-blue-600" />}
                          {activity.type === 'lesson_completion' && <BookOpen className="w-4 h-4 text-green-600" />}
                          {activity.type === 'quiz_completion' && <Trophy className="w-4 h-4 text-purple-600" />}
                          {activity.type === 'achievement_unlock' && <Star className="w-4 h-4 text-yellow-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{activity.description}</p>
                          <p className="text-sm text-slate-500">{activity.user_email}</p>
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">
                        {new Date(activity.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Top Người Dùng</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Điểm</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Level</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Chuỗi</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Ngày học</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-600">#{index + 1}</span>
                          <span className="text-slate-800">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-indigo-600">{user.total_points}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
                          Level {user.current_level}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                          🔥 {user.streak_count}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-600">{user.total_study_days}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span>Quản lý Bài học</span>
              </h3>
              <div className="space-y-4">
                <button className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium">
                  Thêm bài học mới
                </button>
                <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
                  Quản lý bài học hiện có
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span>Quản lý Quiz</span>
              </h3>
              <div className="space-y-4">
                <button className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium">
                  Tạo quiz mới
                </button>
                <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
                  Quản lý quiz hiện có
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Phân tích chi tiết</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-800 mb-2">Xu hướng sử dụng</h4>
                <p className="text-slate-600">Phân tích cách người dùng tương tác với hệ thống</p>
                <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
                  Xem báo cáo
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-800 mb-2">Hiệu suất nội dung</h4>
                <p className="text-slate-600">Đánh giá hiệu quả của bài học và quiz</p>
                <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
                  Xem phân tích
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPageWrapper() {
  return (
    <ProtectedPageWrapper>
      <AdminContent />
    </ProtectedPageWrapper>
  );
}
