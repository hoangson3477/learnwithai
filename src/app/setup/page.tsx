'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import supabase from '@/lib/db/supabase';
import { 
  User, 
  Target, 
  Lightbulb, 
  Check, 
  Loader2, 
  ArrowRight,
  GraduationCap,
  Calculator,
  FlaskConical,
  Globe,
  BookOpen,
  Code,
  MapPin,
  PenTool,
  Palette,
  AlertCircle
} from 'lucide-react';

const LEARNING_TOPICS = [
  { id: 'math', label: 'Toán học', icon: Calculator },
  { id: 'science', label: 'Khoa học', icon: FlaskConical },
  { id: 'english', label: 'Tiếng Anh', icon: Globe },
  { id: 'history', label: 'Lịch sử', icon: BookOpen },
  { id: 'programming', label: 'Lập trình', icon: Code },
  { id: 'geography', label: 'Địa lý', icon: MapPin },
  { id: 'literature', label: 'Văn học', icon: PenTool },
  { id: 'art', label: 'Nghệ thuật', icon: Palette },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 rounded-xl">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold">Chào mừng đến Học với AI!</h1>
          </div>
          <p className="text-indigo-100">Hãy thiết lập hồ sơ của bạn để bắt đầu học tập</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Tên đầy đủ */}
          <div className="mb-8">
            <label htmlFor="fullName" className="block text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              <span>Tên của bạn</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
              placeholder="Ví dụ: Nguyễn Văn A"
              disabled={loading}
            />
          </div>

          {/* Chủ đề học tập */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <span>Các chủ đề bạn muốn học (chọn ít nhất 1)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {LEARNING_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicToggle(topic.id)}
                    disabled={loading}
                    className={`p-4 rounded-xl border-2 transition text-center group ${
                      formData.selectedTopics.includes(topic.id)
                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50'
                        : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                    } disabled:opacity-50`}
                  >
                    <div className="flex justify-center mb-2">
                      <Icon className={`w-8 h-8 ${
                        formData.selectedTopics.includes(topic.id)
                          ? 'text-indigo-600'
                          : 'text-slate-400 group-hover:text-indigo-500'
                      } transition-colors`} />
                    </div>
                    <div className="text-sm font-medium text-slate-700">{topic.label}</div>
                    {formData.selectedTopics.includes(topic.id) && (
                      <div className="flex justify-center mt-2">
                        <Check className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mục tiêu học tập */}
          <div className="mb-8">
            <label htmlFor="goal" className="block text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <span>Mục tiêu học tập (tùy chọn)</span>
            </label>
            <textarea
              id="goal"
              value={formData.learningGoal}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, learningGoal: e.target.value }))
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 resize-none transition-all"
              placeholder="Ví dụ: Muốn tăng cường kỹ năng toán học, chuẩn bị cho kỳ thi..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Nút submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <span>Bắt đầu học tập</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Info box */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl">
          <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            <span>Gợi ý:</span>
          </h3>
          <ul className="text-indigo-800 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Bạn có thể thay đổi các chủ đề học tập bất kỳ lúc nào</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Chọn những chủ đề bạn thực sự quan tâm để học tập hiệu quả hơn</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>AI tutor sẽ giúp bạn học tập thích ứng dựa trên lựa chọn của bạn</span>
            </li>
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
