'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import supabase from '@/lib/db/supabase';

const LEARNING_TOPICS = [
  { id: 'math', label: 'Toán học', emoji: '🔢' },
  { id: 'science', label: 'Khoa học', emoji: '🔬' },
  { id: 'english', label: 'Tiếng Anh', emoji: '🌍' },
  { id: 'history', label: 'Lịch sử', emoji: '📚' },
  { id: 'programming', label: 'Lập trình', emoji: '💻' },
  { id: 'geography', label: 'Địa lý', emoji: '🗺️' },
  { id: 'literature', label: 'Văn học', emoji: '✍️' },
  { id: 'art', label: 'Nghệ thuật', emoji: '🎨' },
];

function SetupContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    selectedTopics: [] as string[],
    learningGoal: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch existing profile data
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('users')
          .select('name, learning_topics, learning_goal')
          .eq('id', user.id)
          .single();

        if (data) {
          setFormData({
            fullName: data.name || '',
            selectedTopics: data.learning_topics || [],
            learningGoal: data.learning_goal || '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleTopicToggle = (topicId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicId)
        ? prev.selectedTopics.filter((t) => t !== topicId)
        : [...prev.selectedTopics, topicId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập tên của bạn');
      setLoading(false);
      return;
    }

    if (formData.selectedTopics.length === 0) {
      setError('Vui lòng chọn ít nhất một chủ đề học tập');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.fullName.trim(),
          learning_topics: formData.selectedTopics,
          learning_goal: formData.learningGoal || null,
          setup_completed: true,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">Chào mừng đến Học với AI! 🎓</h1>
        <p className="text-indigo-100">Hãy thiết lập hồ sơ của bạn để bắt đầu học tập</p>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Tên đầy đủ */}
          <div className="mb-8">
            <label htmlFor="fullName" className="block text-lg font-semibold text-gray-800 mb-3">
              📝 Tên của bạn
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-700"
              placeholder="Ví dụ: Nguyễn Văn A"
              disabled={loading}
            />
          </div>

          {/* Chủ đề học tập */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              🎯 Các chủ đề bạn muốn học (chọn ít nhất 1)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {LEARNING_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleTopicToggle(topic.id)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition text-center ${
                    formData.selectedTopics.includes(topic.id)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-300'
                  } disabled:opacity-50`}
                >
                  <div className="text-3xl mb-2">{topic.emoji}</div>
                  <div className="text-sm font-medium text-gray-700">{topic.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mục tiêu học tập */}
          <div className="mb-8">
            <label htmlFor="goal" className="block text-lg font-semibold text-gray-800 mb-3">
              🚀 Mục tiêu học tập (tùy chọn)
            </label>
            <textarea
              id="goal"
              value={formData.learningGoal}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, learningGoal: e.target.value }))
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-700 resize-none"
              placeholder="Ví dụ: Muốn tăng cường kỹ năng toán học, chuẩn bị cho kỳ thi..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Nút submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 rounded-lg transition text-lg"
          >
            {loading ? 'Đang lưu...' : 'Bắt đầu học tập'}
          </button>
        </form>

        {/* Info box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Gợi ý:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Bạn có thể thay đổi các chủ đề học tập bất kỳ lúc nào</li>
            <li>• Chọn những chủ đề bạn thực sự quan tâm để học tập hiệu quả hơn</li>
            <li>• AI tutor sẽ giúp bạn học tập thích ứng dựa trên lựa chọn của bạn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <ProtectedPageWrapper>
      <SetupContent />
    </ProtectedPageWrapper>
  );
}
