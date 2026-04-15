'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { LoadingSpinner, EmptyState, ErrorMessage } from '@/components/LoadingSpinner';
import Link from 'next/link';
import supabase from '@/lib/db/supabase';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';

interface LessonCard {
  id: string;
  title: string;
  topic: string;
  level: number;
  is_completed: boolean;
  points_reward: number;
}

interface UserStats {
  total_points: number;
  current_level: number;
  streak_count: number;
}
interface UserLessonProgressRow {
  lesson_id: string;
}
interface LessonRow {
  id: string;
  title: string;
  topic: string;
  level: number;
  points_reward: number;
}

const TOPICS = ['Toán học', 'Khoa học', 'Tiếng Anh', 'Lịch sử', 'Lập trình', 'Địa lý', 'Văn học', 'Nghệ thuật'];

function LessonsContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    total_points: 0,
    current_level: 1,
    streak_count: 0,
  });
  const [lessons, setLessons] = useState<LessonCard[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('total_points, current_level, streak_count')
        .eq('id', user.id)
        .single();

      if (data) {
        setStats({
          total_points: data.total_points || 0,
          current_level: data.current_level || 1,
          streak_count: data.streak_count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user?.id]);

  const fetchLessons = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch lessons from database
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        throw lessonsError;
      }

      if (!lessonsData || lessonsData.length === 0) {
        setLessons([]);
        return;
      }

      // Fetch user's lesson progress
      const { data: progressData } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user.id);

      // Create a map of completed lessons
      const completedLessons = new Set(
        (progressData as UserLessonProgressRow[] | null)?.map((p) => p.lesson_id) || []
      );

      // Map database lessons to component format
      const formattedLessons = (lessonsData as LessonRow[]).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        topic: lesson.topic,
        level: lesson.level,
        is_completed: completedLessons.has(lesson.id),
        points_reward: lesson.points_reward || 10,
      }));

      setLessons(formattedLessons);
    } catch (error) {
      console.error('Error in fetchLessons:', error);
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          await Promise.all([
            fetchUserStats(),
            fetchLessons(),
          ]);
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [user?.id, fetchLessons, fetchUserStats]);

  const filteredLessons = selectedTopic === 'Tất cả'
    ? lessons
    : lessons.filter((l) => l.topic === selectedTopic);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 pb-12">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 sticky top-16 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Streak */}
            <div className="text-center">
              <div className="text-3xl font-bold">🔥 {stats.streak_count}</div>
              <p className="text-green-100 text-sm">Streak</p>
            </div>
            {/* Points */}
            <div className="text-center">
              <div className="text-3xl font-bold">⭐ {stats.total_points}</div>
              <p className="text-green-100 text-sm">Điểm</p>
            </div>
            {/* Level */}
            <div className="text-center">
              <div className="text-3xl font-bold">📈 Cấp {stats.current_level}</div>
              <p className="text-green-100 text-sm">Level</p>
            </div>
          </div>

          {/* Progress bar to next level */}
          <div className="hidden md:block flex-1 mx-8">
            <p className="text-xs text-green-100 mb-1">Tiến độ level</p>
            <div className="w-full bg-green-400 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${(stats.total_points % 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={() => {
              setError(null);
              if (user?.id) {
                setLoading(true);
                Promise.all([
                  fetchUserStats(),
                  fetchLessons(),
                ]).then(() => setLoading(false));
              }
            }}
          />
        )}

        {loading ? (
          <LoadingSpinner />
        ) : lessons.length === 0 ? (
          <EmptyState 
            title="Chưa có bài học"
            message="Hiện tại chưa có bài học nào. Vui lòng quay lại sau!"
            icon="📚"
          />
        ) : (
          <>
            {/* Topic Filter */}
            <div className="mb-8">
              <RoadmapRecommendations compact />
            </div>

            {/* Topic Filter */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-3">Chọn chủ đề</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTopic('Tất cả')}
                  className={`px-4 py-2 rounded-full font-medium transition ${
                    selectedTopic === 'Tất cả'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tất cả
                </button>
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-4 py-2 rounded-full font-medium transition ${
                      selectedTopic === topic
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Lessons Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Bài học ({filteredLessons.length})
              </h2>
              
              {filteredLessons.length === 0 ? (
                <EmptyState 
                  title="Không tìm thấy bài học"
                  message={`Không có bài học nào cho chủ đề "${selectedTopic}". Thử chọn chủ đề khác!`}
                  icon="🔍"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLessons.map((lesson) => (
                    <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                      <div className="bg-white rounded-lg shadow hover:shadow-xl transition hover:-translate-y-1 cursor-pointer h-full p-6">
                        {/* Topic Badge */}
                        <div className="flex justify-between items-start mb-4">
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                            {lesson.topic}
                          </span>
                          {lesson.is_completed && (
                            <span className="text-2xl">✅</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                          {lesson.title}
                        </h3>

                        {/* Level */}
                        <p className="text-sm text-gray-500 mb-4">
                          Cấp {lesson.level}
                        </p>

                        {/* Points badge */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <span className="text-sm font-semibold text-green-600">
                            +{lesson.points_reward} ⭐
                          </span>
                          <span className="text-green-500 font-bold">▶</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Info section */}
            {filteredLessons.length > 0 && (
              <div className="mt-12 bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Mẹo học tập:</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Hoàn thành các bài học hàng ngày để duy trì streak</li>
                  <li>• Mỗi bài học hoàn thành sẽ kiếm điểm (⭐) và leo cấp</li>
                  <li>• Bài học bao gồm chat với AI tutor và bài tập trắc nghiệm</li>
                  <li>• Tăng level để unlock những bài học khó hơn</li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LessonsPage() {
  return (
    <ProtectedPageWrapper>
      <LessonsContent />
    </ProtectedPageWrapper>
  );
}
