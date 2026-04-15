'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth-headers';

type Recommendation = {
  id: string;
  content_type: 'lesson' | 'quiz' | 'document';
  score: number;
  subject?: { code?: string; name?: string } | null;
};

const contentTypeToPath: Record<string, string> = {
  lesson: '/lessons',
  quiz: '/quiz',
  document: '/documents',
};

const contentTypeLabel: Record<string, string> = {
  lesson: 'Bài học',
  quiz: 'Bài kiểm tra',
  document: 'Tài liệu',
};

export function RoadmapRecommendations({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    try {
      const headers = await getAuthHeaders();
      let response = await fetch('/api/recommendations', { headers });

      // If no recommendation exists yet, generate once then reload.
      if (response.ok) {
        const initial = await response.json();
        if ((initial.recommendations ?? []).length === 0) {
          await fetch('/api/recommendations', {
            method: 'POST',
            headers,
            body: JSON.stringify({ limit: 5 }),
          });
          response = await fetch('/api/recommendations', { headers });
        } else {
          setItems(initial.recommendations ?? []);
          setLoading(false);
          return;
        }
      }

      const data = await response.json();
      setItems(data.recommendations ?? []);
    } catch (error) {
      console.error('Failed to load recommendations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const handleFeedback = async (id: string, action: 'accepted' | 'skipped' | 'completed') => {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ recommendationId: id, action }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Feedback failed', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Lộ trình cá nhân hóa</h2>
      {loading ? (
        <p className="text-gray-500">Đang tải gợi ý...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Chưa có gợi ý mới. Hãy hoàn thành thêm hoạt động học tập.</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, compact ? 3 : 8).map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {contentTypeLabel[item.content_type]} tiếp theo - {item.subject?.name ?? 'Chung'}
                  </p>
                  <p className="text-sm text-gray-500">Độ ưu tiên: {Math.round(item.score)}/100</p>
                </div>
                <a
                  href={contentTypeToPath[item.content_type]}
                  className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                >
                  Bắt đầu
                </a>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <button onClick={() => handleFeedback(item.id, 'accepted')} className="text-green-600 hover:underline">
                  Nhận gợi ý
                </button>
                <button onClick={() => handleFeedback(item.id, 'completed')} className="text-blue-600 hover:underline">
                  Đã hoàn thành
                </button>
                <button onClick={() => handleFeedback(item.id, 'skipped')} className="text-gray-500 hover:underline">
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
