'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import Link from 'next/link';
import supabase from '@/lib/db/supabase';

interface TopicTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

function NewForumPostContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [topics, setTopics] = useState<TopicTag[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    topic_tag_id: '',
    post_type: 'help' as 'help' | 'theory' | 'discussion',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedPostTypes =
    profile?.role === 'web_admin'
      ? ['help', 'theory', 'discussion']
      : profile?.role === 'contributor'
        ? ['help', 'theory', 'discussion']
        : ['help'];

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết');
      return;
    }

    if (!formData.content.trim()) {
      setError('Vui lòng nhập nội dung bài viết');
      return;
    }

    if (!formData.topic_tag_id) {
      setError('Vui lòng chọn chủ đề');
      return;
    }

    if (!allowedPostTypes.includes(formData.post_type)) {
      setError('Bạn không có quyền tạo loại bài viết này');
      return;
    }

    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from('forum_posts')
        .insert({
          user_id: user?.id,
          title: formData.title,
          content: formData.content,
          topic_tag_id: formData.topic_tag_id,
          post_type: formData.post_type,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (data) {
        router.push(`/forum/post/${data.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo bài viết, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/forum" className="text-green-600 hover:text-green-700 font-medium mb-4 inline-block">
            ← Quay lại diễn đàn
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">✍️ Tạo Bài Viết Mới</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chủ đề */}
            <div>
              <label htmlFor="topic_tag_id" className="block text-sm font-semibold text-gray-700 mb-2">
                Chủ đề <span className="text-red-500">*</span>
              </label>
              <select
                id="topic_tag_id"
                name="topic_tag_id"
                value={formData.topic_tag_id}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Chọn chủ đề --</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.icon} {topic.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại bài viết */}
            <div>
              <label htmlFor="post_type" className="block text-sm font-semibold text-gray-700 mb-2">
                Loại bài viết <span className="text-red-500">*</span>
              </label>
              <select
                id="post_type"
                name="post_type"
                value={formData.post_type}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {allowedPostTypes.includes('help') && <option value="help">Hỏi trợ giúp</option>}
                {allowedPostTypes.includes('theory') && <option value="theory">Chia sẻ lý thuyết</option>}
                {allowedPostTypes.includes('discussion') && <option value="discussion">Thảo luận</option>}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Vai trò hiện tại: <strong>{profile?.role || 'learner'}</strong>
              </p>
            </div>

            {/* Tiêu đề */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Nhập tiêu đề bài viết..."
                disabled={loading}
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/200 ký tự
              </p>
            </div>

            {/* Nội dung */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Viết nội dung bài viết của bạn tại đây..."
                disabled={loading}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.content.length} ký tự
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-bold"
              >
                {loading ? 'Đang tạo...' : '✍️ Tạo Bài Viết'}
              </button>
              <Link
                href="/forum"
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-bold text-center"
              >
                Hủy
              </Link>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">💡 Mẹo:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Viết tiêu đề rõ ràng, mô tả chính xác nội dung</li>
              <li>• Chia sẻ kiến thức có giá trị hoặc hỏi câu hỏi cân nhắc</li>
              <li>• Sử dụng định dạng rõ ràng để bài viết dễ đọc</li>
              <li>• Tuân theo tiêu chuẩn cộng đồng: tôn trọng, không spam</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewForumPostPage() {
  return (
    <ProtectedPageWrapper>
      <NewForumPostContent />
    </ProtectedPageWrapper>
  );
}
