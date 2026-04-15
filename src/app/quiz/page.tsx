'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import { getAuthHeaders } from '@/lib/auth-headers';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';

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
        console.error('Error saving quiz submission:', error);
      }
    };
    saveSubmission();
  }, [showResults, selectedQuiz, user?.id, hasSubmittedResult, answers, calculateScore]);

  if (selectedQuiz && showResults) {
    const score = calculateScore();
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Bài thi hoàn thành!</h1>
            <div className="text-6xl font-bold text-green-500 mb-4">{score}%</div>
            <p className="text-xl text-gray-600 mb-8">
              Bạn đã trả lời đúng {answers.filter((a, idx) => a === selectedQuiz.questions[idx].correctAnswer).length} trên {selectedQuiz.questions.length} câu hỏi.
            </p>
            <button
              onClick={() => {
                setSelectedQuiz(null);
                fetchQuizzes();
              }}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700"
            >
              Quay lại danh sách bài thi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && !showResults) {
    const question = selectedQuiz.questions[currentQuestion];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">{selectedQuiz.title}</h1>
            <span className="text-gray-600">
              Câu {currentQuestion + 1}/{selectedQuiz.questions.length}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / selectedQuiz.questions.length) * 100}%` }}
            ></div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">{question.question}</h2>

            <div className="space-y-3 mb-8">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    answers[currentQuestion] === idx
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 ${
                        answers[currentQuestion] === idx
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-400'
                      }`}
                    ></div>
                    {option}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleNextQuestion}
              disabled={answers[currentQuestion] === -1}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {currentQuestion === selectedQuiz.questions.length - 1 ? 'Hoàn thành bài thi' : 'Câu tiếp theo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Nền tảng bài trắc nghiệm</h1>
        <div className="mb-8">
          <RoadmapRecommendations compact />
        </div>

        {/* Topic Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {['Tất cả', 'Toán học', 'Khoa học', 'Ngôn ngữ', 'Lịch sử'].map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                topic === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Quizzes Grid */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-lg text-gray-600">Không có bài trắc nghiệm. Vui lòng kiểm tra lại sau!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden"
              >
                <div className="bg-gradient-to-r from-indigo-400 to-blue-400 h-32"></div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{quiz.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded">
                      {quiz.topic}
                    </span>
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded">
                      {quiz.difficulty === 'easy' ? 'Dễ' : quiz.difficulty === 'medium' ? 'Trung Bình' : 'Khó'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {quiz.questions.length} câu hỏi
                  </p>
                  <button
                    onClick={() => handleSelectQuiz(quiz)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Bắt đầu bài thi
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
