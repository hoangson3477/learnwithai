'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import Link from 'next/link';
import supabase from '@/lib/db/supabase';

interface LeaderboardUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  total_points: number;
  current_level: number;
  streak_count: number;
}

interface TopForumContributor {
  user_id: string;
  name: string;
  email?: string;
  post_count: number;
  comment_count: number;
  total_engagement: number;
}

function LeaderboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'points' | 'level' | 'forum'>('points');
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [topForumUsers, setTopForumUsers] = useState<TopForumContributor[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPointsLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, name, avatar, total_points, current_level, streak_count')
        .order(activeTab === 'level' ? 'current_level' : 'total_points', { ascending: false })
        .limit(20);

      if (data) {
        setTopUsers(data);

        // Find user's rank
        if (user?.id) {
          const userIndex = data.findIndex((u: LeaderboardUser) => u.id === user.id);
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          } else {
            // User not in top 20, fetch their ranking
            const { data: allUsers } = await supabase
              .from('users')
              .select('id')
              .order(activeTab === 'level' ? 'current_level' : 'total_points', { ascending: false });

            if (allUsers) {
              const rank = allUsers.findIndex((u: { id: string }) => u.id === user.id) + 1;
              setUserRank(rank);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching points leaderboard:', error);
    }
  }, [activeTab, user?.id]);

  const fetchForumLeaderboard = useCallback(async () => {
    try {
      const { data: postData } = await supabase
        .from('forum_posts')
        .select('user_id, users(name, email)');

      const { data: commentData } = await supabase
        .from('forum_comments')
        .select('user_id, users(name, email)');

      // Aggregate data
      const userStats: Record<string, TopForumContributor> = {};

      postData?.forEach((post: { user_id: string; users?: Array<{ name?: string; email?: string }> }) => {
        const postUser = post.users?.[0];
        if (!userStats[post.user_id]) {
          userStats[post.user_id] = {
            user_id: post.user_id,
            name: postUser?.name || 'Ẩn danh',
            email: postUser?.email,
            post_count: 0,
            comment_count: 0,
            total_engagement: 0,
          };
        }
        userStats[post.user_id].post_count += 1;
        userStats[post.user_id].total_engagement += 1;
      });

      commentData?.forEach((comment: { user_id: string; users?: Array<{ name?: string; email?: string }> }) => {
        const commentUser = comment.users?.[0];
        if (!userStats[comment.user_id]) {
          userStats[comment.user_id] = {
            user_id: comment.user_id,
            name: commentUser?.name || 'Ẩn danh',
            email: commentUser?.email,
            post_count: 0,
            comment_count: 0,
            total_engagement: 0,
          };
        }
        userStats[comment.user_id].comment_count += 1;
        userStats[comment.user_id].total_engagement += 0.5; // Comments worth half of posts
      });

      const sorted = Object.values(userStats)
        .sort((a, b) => b.total_engagement - a.total_engagement)
        .slice(0, 20);

      setTopForumUsers(sorted);

      // Find user's rank
      if (user?.id) {
        const userIndex = sorted.findIndex((u) => u.user_id === user.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
        } else {
          const allUsers = Object.values(userStats).sort((a, b) => b.total_engagement - a.total_engagement);
          const rank = allUsers.findIndex((u) => u.user_id === user.id) + 1;
          setUserRank(rank > 0 ? rank : null);
        }
      }
    } catch (error) {
      console.error('Error fetching forum leaderboard:', error);
    }
  }, [user?.id]);

  const fetchLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'forum') {
        await fetchForumLeaderboard();
      } else {
        await fetchPointsLeaderboard();
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchForumLeaderboard, fetchPointsLeaderboard]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 shadow-md">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">🏆 Bảng Xếp Hạng</h1>
          <p className="text-green-100">Cạnh tranh thân thiện và học hỏi cùng cộng đồng</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-4">
          {(['points', 'level', 'forum'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                activeTab === tab
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500'
              }`}
            >
              {tab === 'points' && '⭐ Điểm'}
              {tab === 'level' && '📈 Cấp độ'}
              {tab === 'forum' && '💬 Diễn Đàn'}
            </button>
          ))}
        </div>

        {/* User's Rank Card */}
        {user && userRank && (
          <div className="mb-8 p-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg shadow-lg">
            <p className="text-sm mb-2">Xếp hạng của bạn</p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold">{getMedalEmoji(userRank)}</span>
              <div>
                <p className="text-2xl font-bold">
                  {userRank === 1 && 'Vị trí #1'}
                  {userRank === 2 && 'Vị trí #2'}
                  {userRank === 3 && 'Vị trí #3'}
                  {userRank > 3 && `Vị trí #${userRank}`}
                </p>
                <p className="text-green-100">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-green-500">
                <tr>
                  <th className="text-left px-6 py-4 font-bold text-gray-800">Xếp hạng</th>
                  <th className="text-left px-6 py-4 font-bold text-gray-800">Người dùng</th>
                  {activeTab !== 'forum' && (
                    <>
                      <th className="text-center px-6 py-4 font-bold text-gray-800">Điểm</th>
                      <th className="text-center px-6 py-4 font-bold text-gray-800">Cấp độ</th>
                      {activeTab === 'points' && (
                        <th className="text-center px-6 py-4 font-bold text-gray-800">Streak</th>
                      )}
                    </>
                  )}
                  {activeTab === 'forum' && (
                    <>
                      <th className="text-center px-6 py-4 font-bold text-gray-800">📝 Bài viết</th>
                      <th className="text-center px-6 py-4 font-bold text-gray-800">💬 Bình luận</th>
                      <th className="text-center px-6 py-4 font-bold text-gray-800">Tương tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'forum' ? (
                  topForumUsers.map((contributor, idx) => (
                    <tr
                      key={contributor.user_id}
                      className={`border-b transition ${
                        idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-green-50`}
                    >
                      <td className="px-6 py-4 font-bold text-xl">
                        {getMedalEmoji(idx + 1)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">👤 {contributor.name}</p>
                          <p className="text-sm text-gray-500">{contributor.email || 'Ẩn danh'}</p>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4 font-semibold text-gray-800">
                        {contributor.post_count}
                      </td>
                      <td className="text-center px-6 py-4 font-semibold text-gray-800">
                        {contributor.comment_count}
                      </td>
                      <td className="text-center px-6 py-4 font-bold text-green-600">
                        {contributor.total_engagement.toFixed(1)}
                      </td>
                    </tr>
                  ))
                ) : (
                  topUsers.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`border-b transition ${
                        idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-green-50`}
                    >
                      <td className="px-6 py-4 font-bold text-xl">
                        {getMedalEmoji(idx + 1)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">👤 {u.name}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </td>
                      <td className="text-center px-6 py-4">
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold">
                          ⭐ {u.total_points}
                        </span>
                      </td>
                      <td className="text-center px-6 py-4">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                          📈 {u.current_level}
                        </span>
                      </td>
                      {activeTab === 'points' && (
                        <td className="text-center px-6 py-4">
                          <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold">
                            🔥 {u.streak_count}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-2">⭐ Điểm</h3>
            <p className="text-gray-600 text-sm">
              Mỗi bài học hoàn thành = 5-10 điểm. Tích lũy điểm để thăng cấp!
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-2">📈 Cấp độ</h3>
            <p className="text-gray-600 text-sm">
              100 điểm = 1 cấp độ. Chạm 10+ cấp để unlock bài học nâng cao!
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-2">🔥 Streak</h3>
            <p className="text-gray-600 text-sm">
              Học hàng ngày để duy trì streak. Reset nếu bỏ 1 ngày.
            </p>
          </div>
        </div>

        {/* Forum Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Muốn tham gia cộng đồng?</p>
          <Link
            href="/forum"
            className="inline-block px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold"
          >
            💬 Vào Diễn Đàn
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedPageWrapper>
      <LeaderboardContent />
    </ProtectedPageWrapper>
  );
}
