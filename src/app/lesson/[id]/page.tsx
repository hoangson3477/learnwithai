'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { getAuthHeaders } from '@/lib/auth-headers';
import Link from 'next/link';
import { 
  MessageSquare, 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Trophy, 
  Star, 
  Loader2, 
  BookOpen, 
  Clock,
  ArrowLeft,
  Check,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import ConceptBreakdown from '@/components/ConceptBreakdown';

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

  const [step, setStep] = useState<'concepts' | 'chat' | 'quiz' | 'complete'>('concepts');
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
  const [lessonProgress, setLessonProgress] = useState({
    concepts_completed: false,
    chat_completed: false,
    quiz_completed: false,
    concepts_time: 0,
    chat_time: 0,
  });

  // Save lesson progress as user moves through steps
  const saveLessonProgress = useCallback(async (progressData: Partial<typeof lessonProgress>) => {
    if (!user?.id || !lessonId) return;
    
    try {
      const newProgress = { ...lessonProgress, ...progressData };
      setLessonProgress(newProgress);
      
      // Calculate completion percentage
      let completionPercent = 0;
      if (newProgress.concepts_completed) completionPercent += 33;
      if (newProgress.chat_completed) completionPercent += 33;
      if (newProgress.quiz_completed) completionPercent += 34;
      
      await supabase.from('user_lesson_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        is_completed: newProgress.quiz_completed,
        completion_percentage: completionPercent,
        last_accessed_at: new Date().toISOString(),
        concepts_completed: newProgress.concepts_completed,
        chat_completed: newProgress.chat_completed,
        quiz_completed: newProgress.quiz_completed,
      }, { onConflict: 'user_id,lesson_id' });
    } catch (error) {
      console.error('Error saving lesson progress:', error);
    }
  }, [user?.id, lessonId, lessonProgress]);

  // Load existing lesson progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id || !lessonId) return;
      
      try {
        const { data } = await supabase
          .from('user_lesson_progress')
          .select('concepts_completed, chat_completed, quiz_completed')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .single();
          
        if (data) {
          setLessonProgress({
            concepts_completed: data.concepts_completed || false,
            chat_completed: data.chat_completed || false,
            quiz_completed: data.quiz_completed || false,
            concepts_time: 0,
            chat_time: 0,
          });
        }
      } catch (error) {
        console.log('No existing progress found');
      }
    };
    
    loadProgress();
  }, [user?.id, lessonId]);

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
              quiz_completed: true,
              completion_percentage: 100,
              points_earned: pointsEarned,
              completion_date: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,lesson_id' }
          );
          
          // Update local progress state
          setLessonProgress(prev => ({ ...prev, quiz_completed: true }));
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
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p>Đang tải bài học...</p>
        </div>
      </div>
    );
  }

  if (lessonError || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-xl w-fit mx-auto mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <p className="text-red-600 mb-4">{lessonError || 'Không tìm thấy bài học'}</p>
          <Link href="/lessons" className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách bài học</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 sticky top-16 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep('concepts')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                step === 'concepts'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'bg-indigo-400 text-white hover:bg-indigo-300'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Concepts</span>
            </button>
            <button
              onClick={() => setStep('chat')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                step === 'chat'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'bg-indigo-400 text-white hover:bg-indigo-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setStep('quiz')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                step === 'quiz'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'bg-indigo-400 text-white hover:bg-indigo-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lesson Progress Tracker */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Tiến độ bài học</h2>
            <span className="text-sm text-slate-600">
              {step === 'concepts' ? 'Bước 1/4' : step === 'chat' ? 'Bước 2/4' : step === 'quiz' ? 'Bước 3/4' : 'Hoàn thành!'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{
                width: step === 'concepts' ? '25%' : step === 'chat' ? '50%' : step === 'quiz' ? '75%' : '100%'
              }}
            />
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between">
            {[
              { key: 'concepts', label: 'Concepts', icon: Lightbulb },
              { key: 'chat', label: 'Chat', icon: MessageSquare },
              { key: 'quiz', label: 'Quiz', icon: FileText },
              { key: 'complete', label: 'Hoàn thành', icon: CheckCircle },
            ].map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = step === s.key;
              const isCompleted = 
                (step === 'chat' && idx === 0) ||
                (step === 'quiz' && idx <= 1) ||
                (step === 'complete' && idx <= 2) ||
                (step === 'concepts' && idx === 0 && false);
              
              return (
                <div key={s.key} className="flex items-center">
                  <button
                    onClick={() => {
                      if (s.key !== 'complete') setStep(s.key as typeof step);
                    }}
                    disabled={s.key === 'complete'}
                    className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                      s.key === 'complete' ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : isCompleted
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isCompleted && !isActive ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                  {idx < 3 && (
                    <ChevronRight className={`w-5 h-5 mx-2 ${
                      isCompleted ? 'text-green-400' : 'text-slate-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Chat Step */}
        {step === 'concepts' && (
          <div className="space-y-6">
            <ConceptBreakdown
              lessonId={lessonId}
              userId={user?.id || ''}
              onComplete={(conceptId) => {
                console.log('Completed concept:', conceptId);
              }}
              onCreateFlashcards={(conceptId) => {
                console.log('Created flashcards for concept:', conceptId);
              }}
            />
            <button
              onClick={() => {
                saveLessonProgress({ concepts_completed: true });
                setStep('chat');
              }}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg text-white rounded-xl font-bold transition-all duration-200 text-lg flex items-center justify-center gap-2"
            >
              <span>Tiếp đến Chat</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Chat Step */}
        {step === 'chat' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-slate-50 p-4 rounded-xl">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 flex items-center justify-center h-full">
                  <div>
                    <div className="p-4 bg-indigo-100 rounded-xl w-fit mx-auto mb-4">
                      <MessageSquare className="w-12 h-12 text-indigo-500" />
                    </div>
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
                    className={`max-w-xs px-5 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 px-5 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gõ...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Next button */}
            <button
              onClick={() => {
                saveLessonProgress({ chat_completed: true });
                setStep('quiz');
              }}
              className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg text-white rounded-xl font-bold transition-all duration-200 text-lg flex items-center justify-center gap-2"
            >
              <span>Tiếp đến Quiz</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Quiz Step */}
        {step === 'quiz' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Câu {currentQuestionIdx + 1}/{quizQuestions.length}</span>
                </span>
                <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Đúng: {score}</span>
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question */}
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {q.question}
            </h2>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {q.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={isAnswered}
                  className={`w-full p-4 text-left rounded-xl border-2 font-semibold transition-all duration-200 ${
                    answers[currentQuestionIdx] === idx
                      ? isCorrect
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-red-100 border-red-500 text-red-700'
                      : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                  } ${
                    isAnswered && idx === q.correctAnswer && answers[currentQuestionIdx] !== idx
                      ? 'bg-green-100 border-green-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestionIdx] === idx
                        ? isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-slate-400'
                    }`}>
                      {answers[currentQuestionIdx] === idx && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation */}
            {isAnswered && (
              <div className={`mb-6 p-4 rounded-xl ${
                isCorrect
                  ? 'bg-green-50 border-l-4 border-green-500 text-green-800'
                  : 'bg-red-50 border-l-4 border-red-500 text-red-800'
              }`}>
                <p className="font-semibold mb-1 flex items-center gap-2">
                  {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{isCorrect ? 'Chính xác!' : 'Chưa đúng'}</span>
                </p>
                <p className="text-sm">{q.explanation}</p>
              </div>
            )}

            {/* Next button */}
            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                disabled={quizLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 text-lg flex items-center justify-center gap-2"
              >
                <span>{currentQuestionIdx === quizQuestions.length - 1
                  ? 'Kết thúc Quiz'
                  : 'Câu tiếp theo'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl w-fit mx-auto mb-6">
              <Trophy className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Hoàn thành bài học!
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Bạn đã hoàn thành bài học này. Quay lại để tiếp tục học những bài tiếp theo!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <p className="text-slate-600 mb-1">Quiz Score</p>
                <p className="text-4xl font-bold text-green-600">
                  {percentage}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                <p className="text-slate-600 mb-1 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>Điểm thưởng</span>
                </p>
                <p className="text-4xl font-bold text-indigo-600">
                  +{percentage >= 80 ? 10 : 5}
                </p>
              </div>
            </div>

            <div className="mb-8 text-left">
              <RoadmapRecommendations compact />
            </div>

            <div className="flex gap-4">
              <Link
                href="/lessons"
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg text-white rounded-xl font-bold transition-all duration-200 text-lg flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Quay lại bài học</span>
              </Link>
              <Link
                href="/lessons"
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white rounded-xl font-bold transition-all duration-200 text-lg flex items-center justify-center gap-2"
              >
                <span>Bài học tiếp theo</span>
                <ArrowRight className="w-5 h-5" />
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
