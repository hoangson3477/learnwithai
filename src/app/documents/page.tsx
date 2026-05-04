'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Eye, 
  Heart, 
  ArrowRight, 
  Lightbulb,
  FileText,
  Loader2
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold">Tài liệu học tập</h1>
          </div>
          <p className="text-indigo-100">Khám phá các tài liệu học tập để nâng cao kiến thức của bạn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <RoadmapRecommendations compact />
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search bar */}
          <div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài liệu..."
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Topic filter */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Chủ đề</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic('Tất cả')}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  selectedTopic === 'Tất cả'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Tất cả
              </button>
              {DOCUMENT_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    selectedTopic === topic
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
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
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Đang tải tài liệu...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <div className="p-4 bg-slate-100 rounded-xl w-fit mx-auto mb-4">
              <FileText className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-slate-600 text-lg">Không tìm thấy tài liệu nào</p>
            <p className="text-slate-500">Thử tìm kiếm hoặc thay đổi bộ lọc</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 h-full flex flex-col group"
              >
                {/* Document card */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Topic badge */}
                  <div className="mb-3">
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {doc.topic}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 flex-1">
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {doc.description}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-slate-500 mb-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{doc.views || 0} lượt xem</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{doc.likes || 0} thích</span>
                    </div>
                  </div>

                  {/* Read button */}
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2">
                    <span>Đọc tài liệu</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info section */}
        {filteredDocuments.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl">
            <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              <span>Gợi ý:</span>
            </h3>
            <ul className="text-indigo-800 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Đọc các tài liệu để bổ sung kiến thức trước khi làm bài thi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Dùng các tài liệu này cùng với chat AI để hiểu sâu hơn</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Thích những tài liệu hữu ích để dễ tìm lại sau</span>
              </li>
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
