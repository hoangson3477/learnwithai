'use client';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Plus,
  Brain,
  ArrowRight,
  Sparkles,
  Target,
  FileText,
} from 'lucide-react';

interface Concept {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  order_index: number;
  estimated_time: number;
  difficulty_level: number;
  key_points: string[];
  examples: string[];
  resources: any[];
  userProgress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    time_spent: number;
    notes: string | null;
    flashcards_created: number;
    completed_at?: string;
  };
}

interface ConceptBreakdownProps {
  lessonId: string;
  userId: string;
  onComplete?: (conceptId: string) => void;
  onCreateFlashcards?: (conceptId: string) => void;
}

export default function ConceptBreakdown({
  lessonId,
  userId,
  onComplete,
  onCreateFlashcards,
}: ConceptBreakdownProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [stats, setStats] = useState({
    completed: 0,
    total: 0,
    percentComplete: 0,
    totalTime: 0,
  });

  useEffect(() => {
    if (lessonId && userId) {
      fetchConcepts();
    }
  }, [lessonId, userId]);

  const fetchConcepts = async () => {
    try {
      const response = await fetch(`/api/concepts?lessonId=${lessonId}&userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setConcepts(data.concepts || []);
        calculateStats(data.concepts || []);
      }
    } catch (error) {
      console.error('Error fetching concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (concepts: Concept[]) => {
    const completed = concepts.filter(c => c.userProgress?.status === 'completed').length;
    const totalTime = concepts.reduce((sum, c) => sum + (c.estimated_time || 0), 0);
    setStats({
      completed,
      total: concepts.length,
      percentComplete: concepts.length > 0 ? Math.round((completed / concepts.length) * 100) : 0,
      totalTime,
    });
  };

  const handleGenerateConcepts = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/concepts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const data = await response.json();
      if (data.success) {
        fetchConcepts();
      }
    } catch (error) {
      console.error('Error generating concepts:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteConcept = async (conceptId: string) => {
    try {
      const response = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          userId,
          conceptId,
          lessonId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchConcepts();
        onComplete?.(conceptId);
      }
    } catch (error) {
      console.error('Error completing concept:', error);
    }
  };

  const handleCreateFlashcards = async (conceptId: string) => {
    try {
      const response = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFlashcards',
          userId,
          conceptId,
          lessonId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchConcepts();
        onCreateFlashcards?.(conceptId);
      }
    } catch (error) {
      console.error('Error creating flashcards:', error);
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-green-100 text-green-700';
      case 2: return 'bg-blue-100 text-blue-700';
      case 3: return 'bg-yellow-100 text-yellow-700';
      case 4: return 'bg-orange-100 text-orange-700';
      case 5: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-200 rounded-xl"></div>
            <div className="h-16 bg-slate-200 rounded-xl"></div>
            <div className="h-16 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Chưa có Concept Breakdowns
            </h3>
            <p className="text-slate-600 mb-4">
              Tạo các concepts từ lesson này để học theo từng phần nhỏ, dễ tiếp thu hơn.
            </p>
            <button
              onClick={handleGenerateConcepts}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tự động tạo concepts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="p-6 bg-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Concept Breakdowns</h3>
              <p className="text-sm text-slate-600">
                {stats.completed}/{stats.total} hoàn thành • {stats.totalTime} phút tổng thời gian
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${stats.percentComplete}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600">{stats.percentComplete}%</span>
          </div>
        </div>
      </div>

      {/* Concepts list */}
      <div className="space-y-3">
        {concepts.map((concept, index) => (
          <div
            key={concept.id}
            className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
              concept.userProgress?.status === 'completed'
                ? 'border-green-200 bg-green-50/50'
                : expandedConcept === concept.id
                ? 'border-amber-300 shadow-md'
                : 'border-transparent hover:border-slate-200'
            }`}
          >
            {/* Concept header */}
            <button
              onClick={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
              className="w-full p-4 flex items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(concept.userProgress?.status || 'not_started')}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 font-medium">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h4 className="font-semibold text-slate-800">{concept.title}</h4>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-1">{concept.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getDifficultyColor(concept.difficulty_level)}`}>
                  Level {concept.difficulty_level}
                </span>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>{concept.estimated_time} min</span>
                </div>
                {expandedConcept === concept.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {expandedConcept === concept.id && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <div className="pt-4 space-y-4">
                  {/* Key points */}
                  {concept.key_points && concept.key_points.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-500" />
                        Điểm chính cần nhớ
                      </h5>
                      <ul className="space-y-2">
                        {concept.key_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Examples */}
                  {concept.examples && concept.examples.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Ví dụ
                      </h5>
                      <div className="space-y-2">
                        {concept.examples.map((example, i) => (
                          <div key={i} className="p-3 bg-blue-50 rounded-lg text-sm text-slate-700">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    {concept.userProgress?.status !== 'completed' ? (
                      <button
                        onClick={() => handleCompleteConcept(concept.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đánh dấu hoàn thành</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã hoàn thành</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleCreateFlashcards(concept.id)}
                      className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Brain className="w-4 h-4" />
                      <span>
                        {(concept.userProgress?.flashcards_created ?? 0) > 0
                          ? `Đã có ${concept.userProgress?.flashcards_created} flashcards`
                          : 'Tạo flashcards'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
