'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import Link from 'next/link';
import supabase from '@/lib/db/supabase';

interface TopicTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  topic_tag_id?: string;
  user_id: string;
  likes_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  author?: {
    name: string;
    avatar?: string;
  };
  topic_tag?: TopicTag;
}

type ForumPostQueryResult = ForumPost & {
  users?: ForumPost['author'];
  topic_tags?: TopicTag;
};

function ForumContent() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [topics, setTopics] = useState<TopicTag[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'comments'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchTopics() {
    try {
      const { data } = await supabase
        .from('topic_tags')
        .select('*')
        .order('name', { ascending: true });

      if (data) {
        setTopics(data);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          users:user_id(name, avatar),
          topic_tags:topic_tag_id(*)
        `)
        .order(
          sortBy === 'popular' ? 'likes_count' : sortBy === 'comments' ? 'comment_count' : 'created_at',
          { ascending: false }
        )
        .limit(20);

      if (selectedTopic) {
        query = query.eq('topic_tag_id', selectedTopic);
      }

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Format data with proper author structure
      const formattedPosts = ((data || []) as ForumPostQueryResult[]).map((post) => ({
        ...post,
        author: post.users,
        topic_tag: post.topic_tags,
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTopic, sortBy]);

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 shadow-md">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">💬 Diễn Đàn Học Tập</h1>
          <p className="text-green-100">
            Chia sẻ kiến thức, hỏi đáp, và thảo luận cùng cộng đồng học viên
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Create Post Button & Search */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <Link
            href="/forum/post/new"
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium whitespace-nowrap"
          >
            ✍️ Tạo Bài Viết
          </Link>
        </div>

        {/* Filter & Sort */}
        <div className="mb-8 space-y-4">
          {/* Topic filter */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Chủ đề</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  selectedTopic === null
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500'
                }`}
              >
                Tất cả
              </button>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`px-4 py-2 rounded-full font-medium transition ${
                    selectedTopic === topic.id
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500'
                  }`}
                >
                  {topic.icon} {topic.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sort options */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Sắp xếp</p>
            <div className="flex gap-2">
              {(['recent', 'popular', 'comments'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    sortBy === option
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500'
                  }`}
                >
                  {option === 'recent' && '🕐 Mới nhất'}
                  {option === 'popular' && '❤️ Phổ biến'}
                  {option === 'comments' && '💬 Bình luận'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải bài viết...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 text-lg">📭 Chưa có bài viết nào</p>
            <p className="text-gray-500 mb-4">Hãy được một trong những người đầu tiên chia sẻ!</p>
            <Link
              href="/forum/post/new"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              ✍️ Tạo bài viết đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link key={post.id} href={`/forum/post/${post.id}`}>
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition cursor-pointer">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 hover:text-green-600">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 line-clamp-2 mt-1">{post.content}</p>
                    </div>
                    {post.topic_tag && (
                      <span
                        className="ml-4 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: post.topic_tag.color + '20',
                          color: post.topic_tag.color,
                        }}
                      >
                        {post.topic_tag.icon} {post.topic_tag.name}
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      👤 <span>{post.author?.name || 'Ẩn danh'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      🕐 <span>{formatDate(post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      👁️ <span>{post.view_count || 0} lượt xem</span>
                    </div>
                    <div className="flex items-center gap-1">
                      ❤️ <span>{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      💬 <span>{post.comment_count || 0} bình luận</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumPage() {
  return (
    <ProtectedPageWrapper>
      <ForumContent />
    </ProtectedPageWrapper>
  );
}
