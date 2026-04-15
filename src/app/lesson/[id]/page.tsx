'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { getAuthHeaders } from '@/lib/auth-headers';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface LessonDetail {
  id: string;
  title: string;
  topic: string;
  description: string;
}

interface QuizRow {
  id: string;
  title: string;
  questions: Array<{ id?: number; question: string; options: string[]; correct?: number; explanation?: string }>;
}

const DEFAULT_QUIZ: Question[] = [
  {
    id: 1,
    question: 'Bạn đã nắm được ý chính của bài học chưa?',
    options: ['Chưa rõ', 'Đã nắm cơ bản', 'Hiểu tốt', 'Rất tự tin'],
    correctAnswer: 2,
    explanation: 'Hãy tập trung vào các điểm chính trong phần tóm tắt bài học.',
  },
];

function LessonContent() {
  const params = useParams();
  const { user } = useAuth();
  const lessonId = params?.id as string;

  const [step, setStep] = useState<'chat' | 'quiz' | 'complete'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(DEFAULT_QUIZ);

  // Quiz state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(DEFAULT_QUIZ.length).fill(-1));
  const [quizLoading, setQuizLoading] = useState(false);
  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonId) return;
      setLessonLoading(true);
      setLessonError(null);
      try {
        const { data: lessonData, error } = await supabase
          .from('lessons')
          .select('id, title, topic, description')
          .eq('id', lessonId)
          .single();

        if (error || !lessonData) {
          throw new Error('Không tìm thấy bài học');
        }
        setLesson(lessonData);

        const { data: quizData } = await supabase
          .from('quizzes')
          .select('id, title, questions, lesson_id')
          .or(`lesson_id.eq.${lessonId},topic.eq.${lessonData.topic}`)
          .limit(1)
          .maybeSingle();

        if (quizData?.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
          const normalized = (quizData as QuizRow).questions.map((q, idx) => ({
            id: q.id ?? idx + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correct ?? 0,
            explanation: q.explanation ?? 'Xem lại nội dung bài học để củng cố kiến thức.',
          }));
          setQuizQuestions(normalized);
          setAnswers(new Array(normalized.length).fill(-1));
        }
      } catch (error) {
        console.error('Error loading lesson detail:', error);
        setLessonError(error instanceof Error ? error.message : 'Không thể tải bài học');
      } finally {
        setLessonLoading(false);
      }
    };

    loadLesson();
  }, [lessonId]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call /api/chat endpoint instead of using genAI directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message: input,
          topic: lesson?.topic || 'General Learning',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.message || 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại! 😊';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantContent },
      ]);
    } catch (error: unknown) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại! 😊',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score = answers.filter(
      (ans, idx) => ans === quizQuestions[idx].correctAnswer
    ).length;
    const percentage = Math.round((score / quizQuestions.length) * 100);

    setQuizLoading(true);

    try {
      if (user?.id && lessonId) {

        // Fetch current user data
        const { data: userData } = await supabase
          .from('users')
          .select('total_points, current_level, streak_count, last_lesson_date')
          .eq('id', user.id)
          .single();

        if (userData) {
          const pointsEarned = percentage >= 80 ? 10 : 5;
          const newTotal = (userData.total_points || 0) + pointsEarned;
          const newLevel = Math.floor(newTotal / 100) + 1;

          // Calculate streak
          let newStreak = userData.streak_count || 1;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastLessonDate = userData.last_lesson_date
            ? new Date(userData.last_lesson_date)
            : null;

          if (lastLessonDate) {
            lastLessonDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor(
              (today.getTime() - lastLessonDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 0) {
              // Already done today, keep streak
              newStreak = userData.streak_count || 1;
            } else if (daysDiff === 1) {
              // Done yesterday, increment streak
              newStreak = (userData.streak_count || 1) + 1;
            } else {
              // More than 1 day gap, reset to 1
              newStreak = 1;
            }
          }

          // Update user points, level, and streak
          await supabase.from('users').update({
            total_points: newTotal,
            current_level: newLevel,
            streak_count: newStreak,
            last_lesson_date: new Date().toISOString().split('T')[0],
          }).eq('id', user.id);

          // Save/update lesson progress
          await supabase.from('user_lesson_progress').upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              is_completed: percentage >= 60,
              points_earned: pointsEarned,
              completion_date: new Date().toISOString(),
            },
            { onConflict: 'user_id,lesson_id' }
          );
        }
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setQuizLoading(false);
      setStep('complete');
    }
  };

  const q = quizQuestions[currentQuestionIdx];
  const score = answers.filter(
    (ans, idx) => ans === quizQuestions[idx].correctAnswer
  ).length;
  const percentage = Math.round((score / quizQuestions.length) * 100);
  const isAnswered = answers[currentQuestionIdx] !== -1;
  const isCorrect = isAnswered && answers[currentQuestionIdx] === q.correctAnswer;

  if (lessonLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Đang tải bài học...</div>;
  }

  if (lessonError || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{lessonError || 'Không tìm thấy bài học'}</p>
          <Link href="/lessons" className="text-indigo-600 hover:underline">Quay lại danh sách bài học</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 sticky top-16 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">📚 {lesson.title}</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setStep('chat')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                step === 'chat'
                  ? 'bg-white text-green-600'
                  : 'bg-green-400 text-white hover:bg-green-300'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setStep('quiz')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                step === 'quiz'
                  ? 'bg-white text-green-600'
                  : 'bg-green-400 text-white hover:bg-green-300'
              }`}
            >
              📝 Quiz
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Chat Step */}
        {step === 'chat' && (
          <div className="bg-white rounded-lg shadow-lg p-6 h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-gray-50 p-4 rounded-lg">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 flex items-center justify-center h-full">
                  <div>
                    <p className="text-2xl mb-2">👋</p>
                    <p>Hãy nói &quot;Hello&quot; hoặc bất kỳ điều gì bạn muốn học!</p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                    Đang gõ...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-semibold transition"
              >
                ▶
              </button>
            </form>

            {/* Next button */}
            <button
              onClick={() => setStep('quiz')}
              className="w-full mt-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition text-lg"
            >
              Tiếp đến Quiz ▶
            </button>
          </div>
        )}

        {/* Quiz Step */}
        {step === 'quiz' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">
                  Câu {currentQuestionIdx + 1}/{quizQuestions.length}
                </span>
                <span className="text-sm font-semibold text-green-600">
                  Đúng: {score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {q.question}
            </h2>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {q.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={isAnswered}
                  className={`w-full p-4 text-left rounded-lg border-2 font-semibold transition ${
                    answers[currentQuestionIdx] === idx
                      ? isCorrect
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-red-100 border-red-500 text-red-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${
                    isAnswered && idx === q.correctAnswer && answers[currentQuestionIdx] !== idx
                      ? 'bg-green-100 border-green-500'
                      : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {isAnswered && (
              <div className={`mb-6 p-4 rounded-lg ${
                isCorrect
                  ? 'bg-green-50 border-l-4 border-green-500 text-green-800'
                  : 'bg-red-50 border-l-4 border-red-500 text-red-800'
              }`}>
                <p className="font-semibold mb-1">
                  {isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng'}
                </p>
                <p className="text-sm">{q.explanation}</p>
              </div>
            )}

            {/* Next button */}
            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                disabled={quizLoading}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition text-lg"
              >
                {currentQuestionIdx === quizQuestions.length - 1
                  ? 'Kết thúc Quiz ✓'
                  : 'Câu tiếp theo ▶'}
              </button>
            )}
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Hoàn thành bài học!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Bạn đã hoàn thành bài học này. Quay lại để tiếp tục học những bài tiếp theo!
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-gray-600 mb-1">Quiz Score</p>
                <p className="text-4xl font-bold text-green-600">
                  {percentage}%
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-gray-600 mb-1">Điểm thưởng</p>
                <p className="text-4xl font-bold text-blue-600">
                  +{percentage >= 80 ? 10 : 5} ⭐
                </p>
              </div>
            </div>

            <div className="mb-8 text-left">
              <RoadmapRecommendations compact />
            </div>

            <div className="flex gap-4">
              <Link
                href="/lessons"
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition text-lg"
              >
                ← Quay lại bài học
              </Link>
              <Link
                href="/lessons"
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition text-lg"
              >
                Bài học tiếp theo →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonDetailPage() {
  return (
    <ProtectedPageWrapper>
      <LessonContent />
    </ProtectedPageWrapper>
  );
}
