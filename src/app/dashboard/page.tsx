'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Flame, 
  Bot, 
  BookOpen, 
  Eye, 
  Heart, 
  ArrowRight,
  TrendingUp,
  Target
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  topic: string;
  author: { name: string; avatar?: string };
  views: number;
  likes: number;
  createdAt: string;
}

function DashboardContent() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({
    totalQuizzesTaken: 0,
    totalChatSessions: 0,
    learningTopics: 0,
    streak: 0,
  });

  const fetchUserStats = useCallback(async () => {
    try {
      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('total_quizzes_taken, total_chat_sessions, learning_topics, streak_count')
        .eq('id', user?.id)
        .single();

      // Fetch chat sessions count
      const { count: chatCount } = await supabase
        .from('chat_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Fetch quiz submissions count
      const { count: quizCount } = await supabase
        .from('quiz_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats({
        totalQuizzesTaken: quizCount || userData?.total_quizzes_taken || 0,
        totalChatSessions: chatCount || userData?.total_chat_sessions || 0,
        learningTopics: (userData?.learning_topics || []).length,
        streak: userData?.streak_count || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [user]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      await fetchDocuments();
      if (user?.id) {
        await fetchUserStats();
      }
    };
    loadDashboard();
  }, [fetchDocuments, fetchUserStats, user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Chào mừng quay trở lại!</h1>
          <p className="text-indigo-100">Bảng điều khiển học tập của bạn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-semibold mb-1">Bài thi đã làm</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.totalQuizzesTaken}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="p-3 bg-green-100 rounded-xl w-fit mb-4">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-semibold mb-1">Phiên chat</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.totalChatSessions}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="p-3 bg-purple-100 rounded-xl w-fit mb-4">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-semibold mb-1">Chủ đề đang học</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.learningTopics}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="p-3 bg-orange-100 rounded-xl w-fit mb-4">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-semibold mb-1">Chuỗi học tập</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.streak}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/chat"
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Bắt đầu chat</h2>
            <p className="text-slate-600">Học từ các trợ lý AI</p>
          </Link>

          <Link
            href="/quiz"
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Làm bài thi</h2>
            <p className="text-slate-600">Kiểm tra kiến thức của bạn</p>
          </Link>

          <a
            href="#documents"
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Duyệt tài liệu</h2>
            <p className="text-slate-600">Truy cập tài liệu học tập</p>
          </a>
        </div>

        <div className="mb-8">
          <RoadmapRecommendations compact />
        </div>

        {/* Learning Materials */}
        <div id="documents" className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              <span>Tài liệu được đề xuất</span>
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="p-4 bg-slate-100 rounded-xl w-fit mx-auto mb-4">
                <FileText className="w-12 h-12 text-slate-400" />
              </div>
              <p>Chưa có tài liệu nào. Vui lòng kiểm tra lại sau!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{doc.title}</h3>
                    <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      {doc.topic}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-3 line-clamp-2">{doc.description}</p>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{doc.views} lượt xem</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{doc.likes} thích</span>
                      </span>
                    </div>
                    <span>Bởi {doc.author?.name || 'Ẩn danh'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {documents.length > 5 && (
            <div className="p-6 text-center border-t border-slate-200">
              <Link
                href="/documents"
                className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
              >
                <span>Xem tất cả tài liệu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPageWrapper>
      <DashboardContent />
    </ProtectedPageWrapper>
  );
}
