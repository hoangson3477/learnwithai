'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';

interface Document {
  id: string;
  title: string;
  description: string;
  topic: string;
  content?: string;
  views?: number;
  likes?: number;
  created_at?: string;
}

const DOCUMENT_TOPICS = [
  'Toán học',
  'Khoa học',
  'Tiếng Anh',
  'Lịch sử',
  'Lập trình',
  'Địa lý',
  'Văn học',
  'Nghệ thuật',
];

function DocumentsContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      const data = await response.json();
      
      // Use documents from database (or empty array if none)
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // On error, show empty state instead of fallback data
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = useCallback(() => {
    let filtered = documents;

    // Filter by topic
    if (selectedTopic !== 'Tất cả') {
      filtered = filtered.filter((doc) => doc.topic === selectedTopic);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedTopic, searchQuery]);

  useEffect(() => {
    filterDocuments();
  }, [filterDocuments]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">📚 Tài liệu học tập</h1>
        <p className="text-purple-100">Khám phá các tài liệu học tập để nâng cao kiến thức của bạn</p>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <RoadmapRecommendations compact />
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search bar */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Topic filter */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Chủ đề</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic('Tất cả')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedTopic === 'Tất cả'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tất cả
              </button>
              {DOCUMENT_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedTopic === topic
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải tài liệu...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">Không tìm thấy tài liệu nào</p>
            <p className="text-gray-500">Thử tìm kiếm hoặc thay đổi bộ lọc</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition h-full flex flex-col"
              >
                {/* Document card */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Topic badge */}
                  <div className="mb-3">
                    <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {doc.topic}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex-1">
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {doc.description}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-gray-500 mb-4 border-t pt-4">
                    <div className="flex items-center gap-1">
                      👁️ <span>{doc.views || 0} lượt xem</span>
                    </div>
                    <div className="flex items-center gap-1">
                      ❤️ <span>{doc.likes || 0} thích</span>
                    </div>
                  </div>

                  {/* Read button */}
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition">
                    Đọc tài liệu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info section */}
        {filteredDocuments.length > 0 && (
          <div className="mt-12 bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Gợi ý:</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Đọc các tài liệu để bổ sung kiến thức trước khi làm bài thi</li>
              <li>• Dùng các tài liệu này cùng với chat AI để hiểu sâu hơn</li>
              <li>• Thích những tài liệu hữu ích để dễ tìm lại sau</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <ProtectedPageWrapper>
      <DocumentsContent />
    </ProtectedPageWrapper>
  );
}
