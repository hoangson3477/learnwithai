'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import { getAuthHeaders } from '@/lib/auth-headers';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Trophy, 
  BookOpen, 
  Clock, 
  Target, 
  Filter,
  ArrowLeft,
  Check,
  Eye,
  RotateCcw
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

function QuizContent() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [topic, setTopic] = useState('Tất cả');
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (topic !== 'Tất cả') params.append('topic', topic);

      const response = await fetch(`/api/quiz?${params}`);
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  }, [topic]);

  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setCurrentQuestion(0);
    setShowResults(false);
    setHasSubmittedResult(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (selectedQuiz && currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (selectedQuiz && currentQuestion === selectedQuiz.questions.length - 1) {
      setShowResults(true);
    }
  };

  const calculateScore = useCallback(() => {
    if (!selectedQuiz) return 0;
    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) correct++;
    });
    return Math.round((correct / selectedQuiz.questions.length) * 100);
  }, [selectedQuiz, answers]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  useEffect(() => {
    const saveSubmission = async () => {
      if (!selectedQuiz || !showResults || hasSubmittedResult) return;
      if (!user?.id) return;

      try {
        const score = calculateScore();
        const headers = await getAuthHeaders();
        await fetch('/api/quiz-submit', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            quizId: selectedQuiz.id,
            score,
            answers,
            topic: selectedQuiz.topic,
          }),
        });
        setHasSubmittedResult(true);
      } catch (error) {
        logger.error('Error saving quiz submission:', error);
      }
    };
    saveSubmission();
  }, [showResults, selectedQuiz, user?.id, hasSubmittedResult, answers, calculateScore]);

  if (selectedQuiz && showResults) {
    const score = calculateScore();
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-3xl mx-auto">
          {!showReview ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl w-fit mx-auto mb-6">
                <Trophy className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 mb-4">Bài thi hoàn thành!</h1>
              <div className="text-6xl font-bold text-green-500 mb-4">{score}%</div>
              <p className="text-xl text-slate-600 mb-2">
                Bạn đã trả lời đúng {answers.filter((a, idx) => a === selectedQuiz.questions[idx].correctAnswer).length} trên {selectedQuiz.questions.length} câu hỏi.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                {score >= 80 ? '🌟 Xuất sắc! Kiến thức vững vàng' : score >= 60 ? '👍 Khá tốt! Cần ôn thêm một chút' : '📚 Cần ôn tập thêm để cải thiện'}
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowReview(true)}
                  className="px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Xem lại đáp án</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentQuestion(0);
                    setAnswers([]);
                    setShowResults(false);
                    setHasSubmittedResult(false);
                    setShowReview(false);
                  }}
                  className="px-6 py-3 bg-white border-2 border-green-200 text-green-600 rounded-xl hover:bg-green-50 transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Làm lại</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedQuiz(null);
                    setShowReview(false);
                    fetchQuizzes();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Quay lại</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Xem lại đáp án</h2>
                <button
                  onClick={() => setShowReview(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Quay lại kết quả
                </button>
              </div>
              
              {selectedQuiz.questions.map((q, idx) => {
                const userAnswer = answers[idx];
                const isCorrect = userAnswer === q.correctAnswer;
                
                return (
                  <div key={idx} className={`bg-white rounded-2xl shadow-sm border p-6 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-sm text-slate-500">Câu {idx + 1}</span>
                        <h3 className="font-semibold text-slate-800">{q.question}</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 ml-11">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-lg ${
                            optIdx === q.correctAnswer
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : optIdx === userAnswer && !isCorrect
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{String.fromCharCode(65 + optIdx)}.</span>
                            <span>{opt}</span>
                            {optIdx === q.correctAnswer && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
                            {optIdx === userAnswer && !isCorrect && <XCircle className="w-4 h-4 ml-auto text-red-600" />}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {q.explanation && (
                      <div className="mt-4 ml-11 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800">
                        <span className="font-semibold">Giải thích: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedQuiz && !showResults) {
    const question = selectedQuiz.questions[currentQuestion];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">{selectedQuiz.title}</h1>
            <span className="text-slate-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Câu {currentQuestion + 1}/{selectedQuiz.questions.length}</span>
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2 mb-8">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / selectedQuiz.questions.length) * 100}%` }}
            ></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">{question.question}</h2>

            <div className="space-y-3 mb-8">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    answers[currentQuestion] === idx
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        answers[currentQuestion] === idx
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-slate-400'
                      }`}
                    >
                      {answers[currentQuestion] === idx && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {option}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleNextQuestion}
              disabled={answers[currentQuestion] === -1}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <span>{currentQuestion === selectedQuiz.questions.length - 1 ? 'Hoàn thành bài thi' : 'Câu tiếp theo'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800">Nền tảng bài trắc nghiệm</h1>
        </div>
        <div className="mb-8">
          <RoadmapRecommendations compact />
        </div>

        {/* Topic Filter */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Chọn chủ đề</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {['Tất cả', 'Toán học', 'Khoa học', 'Ngôn ngữ', 'Lịch sử'].map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  topic === t
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Quizzes Grid */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="p-4 bg-slate-100 rounded-xl w-fit mx-auto mb-4">
              <BookOpen className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-lg text-slate-600">Không có bài trắc nghiệm. Vui lòng kiểm tra lại sau!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                <div className="bg-gradient-to-r from-indigo-400 to-purple-400 h-32 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all"></div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{quiz.title}</h3>
                  <p className="text-slate-600 mb-4 line-clamp-2">{quiz.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      {quiz.topic}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      quiz.difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800' 
                        : quiz.difficulty === 'medium' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {quiz.difficulty === 'easy' ? 'Dễ' : quiz.difficulty === 'medium' ? 'Trung Bình' : 'Khó'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span>{quiz.questions.length} câu hỏi</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectQuiz(quiz)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                  >
                    <span>Bắt đầu bài thi</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <ProtectedPageWrapper>
      <QuizContent />
    </ProtectedPageWrapper>
  );
}
