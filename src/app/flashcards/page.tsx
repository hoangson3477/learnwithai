'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import {
  Brain,
  Clock,
  RotateCcw,
  Check,
  X,
  Plus,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Calendar,
  Flame,
} from 'lucide-react';

interface Flashcard {
  id: string;
  concept: string;
  front: string;
  back: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  total_reviews: number;
  correct_reviews: number;
}

interface Stats {
  totalFlashcards: number;
  dueCards: number;
  totalConcepts: number;
  masteredConcepts: number;
  averageMastery: number;
  todayReviews: number;
  streak: number;
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  // Form state for new flashcard
  const [newCard, setNewCard] = useState({
    concept: '',
    front: '',
    back: '',
    tags: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchDueFlashcards();
      fetchStats();
    }
  }, [user?.id]);

  const fetchDueFlashcards = async () => {
    try {
      const response = await fetch(`/api/flashcards?userId=${user?.id}&dueForReview=true&limit=50`);
      const data = await response.json();
      if (data.success) {
        setFlashcards(data.flashcards);
        setCurrentIndex(0);
        setReviewComplete(data.flashcards.length === 0);
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/flashcards/stats?userId=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleReview = async (quality: number) => {
    if (!flashcards[currentIndex]) return;

    const flashcard = flashcards[currentIndex];

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          flashcardId: flashcard.id,
          quality,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        // Move to next card
        if (currentIndex < flashcards.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsFlipped(false);
        } else {
          setReviewComplete(true);
        }
        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          concept: newCard.concept,
          front: newCard.front,
          back: newCard.back,
          tags: newCard.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewCard({ concept: '', front: '', back: '', tags: '' });
        fetchDueFlashcards();
        fetchStats();
      }
    } catch (error) {
      console.error('Error adding flashcard:', error);
    }
  };

  const getDifficultyLabel = (quality: number) => {
    switch (quality) {
      case 1: return 'Quên';
      case 2: return 'Khó';
      case 3: return 'Vừa';
      case 4: return 'Dễ';
      case 5: return 'Rất dễ';
      default: return '';
    }
  };

  const getDifficultyColor = (quality: number) => {
    switch (quality) {
      case 1: return 'bg-red-500 hover:bg-red-600';
      case 2: return 'bg-orange-500 hover:bg-orange-600';
      case 3: return 'bg-yellow-500 hover:bg-yellow-600';
      case 4: return 'bg-blue-500 hover:bg-blue-600';
      case 5: return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Flashcards</h1>
              <p className="text-slate-600">Học tập với spaced repetition</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm Flashcard</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span className="text-sm text-slate-600">Tổng Flashcards</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalFlashcards}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-slate-600">Cần ôn tập</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stats.dueCards}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-600">Thành thạo</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stats.masteredConcepts}/{stats.totalConcepts}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-sm text-slate-600">Streak</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stats.streak} ngày</p>
            </div>
          </div>
        )}

        {/* Review Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {reviewComplete ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                <Sparkles className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Chúc mừng! Bạn đã hoàn thành tất cả flashcards.
              </h2>
              <p className="text-slate-600 mb-6">
                Hôm nay bạn đã ôn tập {stats?.todayReviews || 0} flashcards. Quay lại vào ngày mai để tiếp tục!
              </p>
              <button
                onClick={fetchDueFlashcards}
                className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all"
              >
                Làm mới
              </button>
            </div>
          ) : flashcards.length > 0 ? (
            <div>
              {/* Progress */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-slate-600">
                  Flashcard {currentIndex + 1} / {flashcards.length}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Flashcard */}
              <div className="max-w-2xl mx-auto">
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="relative aspect-[3/2] cursor-pointer perspective-1000"
                >
                  <div
                    className={`absolute inset-0 transition-all duration-500 transform-style-preserve-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 flex flex-col items-center justify-center text-white shadow-xl">
                        <span className="text-sm uppercase tracking-wider opacity-70 mb-4">
                          {flashcards[currentIndex].concept}
                        </span>
                        <p className="text-2xl font-semibold text-center">
                          {flashcards[currentIndex].front}
                        </p>
                        <p className="text-sm opacity-50 mt-8">Nhấn để lật</p>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <div className="w-full h-full bg-white border-2 border-indigo-200 rounded-3xl p-8 flex flex-col items-center justify-center shadow-xl">
                        <span className="text-sm uppercase tracking-wider text-slate-500 mb-4">
                          Đáp án
                        </span>
                        <p className="text-2xl font-semibold text-center text-slate-800">
                          {flashcards[currentIndex].back}
                        </p>
                        <div className="flex items-center gap-4 mt-8 text-sm text-slate-500">
                          <span>Đã ôn: {flashcards[currentIndex].total_reviews} lần</span>
                          <span>•</span>
                          <span>Đúng: {flashcards[currentIndex].correct_reviews} lần</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating Buttons */}
                <div className="grid grid-cols-5 gap-3 mt-8">
                  {[1, 2, 3, 4, 5].map((quality) => (
                    <button
                      key={quality}
                      onClick={() => handleReview(quality)}
                      disabled={!isFlipped}
                      className={`p-3 rounded-xl text-white font-medium transition-all ${
                        isFlipped
                          ? getDifficultyColor(quality)
                          : 'bg-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-lg font-bold">{quality}</div>
                      <div className="text-xs">{getDifficultyLabel(quality)}</div>
                    </button>
                  ))}
                </div>

                {!isFlipped && (
                  <p className="text-center text-slate-500 mt-4">
                    Lật flashcard để đánh giá
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-6">
                <Layers className="w-12 h-12 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Chưa có flashcards
              </h2>
              <p className="text-slate-600 mb-6">
                Bắt đầu tạo flashcards để học tập hiệu quả hơn!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                Tạo Flashcard đầu tiên
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Thêm Flashcard</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddFlashcard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Target className="w-4 h-4 inline mr-2" />
                  Concept
                </label>
                <input
                  type="text"
                  value={newCard.concept}
                  onChange={(e) => setNewCard({ ...newCard, concept: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: JavaScript, Toán học..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Layers className="w-4 h-4 inline mr-2" />
                  Mặt trước (Câu hỏi)
                </label>
                <textarea
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="Nhập câu hỏi..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Check className="w-4 h-4 inline mr-2" />
                  Mặt sau (Đáp án)
                </label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="Nhập đáp án..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={newCard.tags}
                  onChange={(e) => setNewCard({ ...newCard, tags: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="javascript, basics, react..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Thêm Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
