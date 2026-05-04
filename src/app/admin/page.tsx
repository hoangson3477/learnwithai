'use client';

import { useEffect, useState, useRef } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { getAuthHeaders } from '@/lib/auth-headers';
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Save, 
  Settings, 
  LayoutDashboard,
  Loader2,
  AlertCircle,
  Edit,
  X
} from 'lucide-react';

type GradeLevel = { id: string; grade: number; label: string };
type Lesson = { 
  id: string; 
  title: string; 
  topic: string; 
  level: number;
  description?: string;
  grade_level_id?: string;
  content?: any;
};
type DocumentItem = { id: string; title: string; topic: string; document_type: string; grade_level_id?: string; has_chunks?: boolean };
type SourceFile = { id: string; file_name: string; file_type: string; processing_status: string; error_message?: string };

function AdminContent() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'lessons' | 'documents' | 'generate'>('lessons');
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docSourceFiles, setDocSourceFiles] = useState<Record<string, SourceFile[]>>({});
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    topic: 'Toán Học',
    level: 1,
    grade_level_id: '',
    introduction: '',
    key_points: [''],
    examples: [''],
    exercises: [''],
  });

  const [quizQuestions, setQuizQuestions] = useState<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
  ]);

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
    topic: 'Toán Học',
    content: '',
    document_type: 'theory',
    grade_level_id: '',
  });

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    topic: '',
    subject: 'Toán Học',
    grade_level_id: '',
    useRAG: true,
  });
  const [generatedContent, setGeneratedContent] = useState<{
    introduction: string;
    key_points: string[];
    examples: string[];
    exercises: string[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    const [{ data: gradeData }, { data: lessonData }, { data: docData }] = await Promise.all([
      supabase.from('grade_levels').select('id, grade, label').order('grade', { ascending: true }),
      supabase.from('lessons').select('id, title, topic, level').order('created_at', { ascending: false }).limit(50),
      supabase.from('documents').select('id, title, topic, document_type, grade_level_id').order('created_at', { ascending: false }).limit(50),
    ]);
    setGrades((gradeData ?? []) as GradeLevel[]);
    setLessons((lessonData ?? []) as Lesson[]);
    
    // Check which documents have chunks
    const docsWithChunks = await Promise.all(
      (docData ?? []).map(async (doc) => {
        const { count } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);
        return { ...doc, has_chunks: (count || 0) > 0 };
      })
    );
    setDocuments(docsWithChunks);
    
    // Load source files for each document
    const sourceFilesMap: Record<string, SourceFile[]> = {};
    await Promise.all(
      docsWithChunks.map(async (doc) => {
        const { data: files } = await supabase
          .from('document_source_files')
          .select('id, file_name, file_type, processing_status, error_message')
          .eq('document_id', doc.id)
          .order('created_at', { ascending: false });
        sourceFilesMap[doc.id] = files || [];
      })
    );
    setDocSourceFiles(sourceFilesMap);
  };

  useEffect(() => {
    if (profile?.role === 'web_admin') {
      queueMicrotask(() => {
        void loadData();
      });
    }
  }, [profile?.role]);

  const createLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    
    // Filter empty items
    const validKeyPoints = lessonForm.key_points.filter(p => p.trim() !== '');
    const validExamples = lessonForm.examples.filter(e => e.trim() !== '');
    const validExercises = lessonForm.exercises.filter(e => e.trim() !== '');
    const validQuizQuestions = quizQuestions.filter(q => q.question.trim() !== '');
    
    const lessonData = {
      title: lessonForm.title,
      description: lessonForm.description,
      topic: lessonForm.topic,
      level: lessonForm.level,
      order_index: lessonForm.level,
      lesson_type: 'conversation',
      content: {
        introduction: lessonForm.introduction || lessonForm.description,
        key_points: validKeyPoints.length > 0 ? validKeyPoints : ['Nội dung sẽ cập nhật'],
        examples: validExamples,
        exercises: validExercises,
      },
      points_reward: 10,
      grade_level_id: lessonForm.grade_level_id || null,
    };
    
    let error;
    let lessonId = editingLessonId;
    
    if (editingLessonId) {
      // Update existing lesson
      const { error: updateError } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', editingLessonId);
      error = updateError;
    } else {
      // Create new lesson
      const { error: insertError, data } = await supabase.from('lessons').insert(lessonData).select('id').single();
      error = insertError;
      if (!error && data) {
        lessonId = data.id;
      }
    }
    
    if (error) {
      setStatus(`Lỗi ${editingLessonId ? 'cập nhật' : 'tạo'} lesson: ${error.message}`);
      return;
    }
    
    // Create or update quiz if there are questions
    if (validQuizQuestions.length > 0 && lessonId) {
      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('lesson_id', lessonId)
        .single();
      
      const quizData = {
        title: `Quiz: ${lessonForm.title}`,
        topic: lessonForm.topic,
        difficulty: 'medium',
        lesson_id: lessonId,
        questions: validQuizQuestions,
      };
      
      if (existingQuiz) {
        await supabase.from('quizzes').update(quizData).eq('id', existingQuiz.id);
      } else {
        await supabase.from('quizzes').insert(quizData);
      }
    }
    
    setStatus(`${editingLessonId ? 'Cập nhật' : 'Tạo'} lesson thành công`);
    resetLessonForm();
    loadData();
    setTimeout(() => setStatus(''), 3000);
  };

  const handleEditLesson = async (lessonId: string) => {
    setStatus('Đang tải dữ liệu lesson...');
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();
    
    if (error || !lesson) {
      setStatus('Lỗi tải lesson');
      return;
    }
    
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      topic: lesson.topic,
      level: lesson.level,
      grade_level_id: lesson.grade_level_id || '',
      introduction: lesson.content?.introduction || '',
      key_points: lesson.content?.key_points?.length > 0 ? lesson.content.key_points : [''],
      examples: lesson.content?.examples?.length > 0 ? lesson.content.examples : [''],
      exercises: lesson.content?.exercises?.length > 0 ? lesson.content.exercises : [''],
    });
    
    // Load quiz questions
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('questions')
      .eq('lesson_id', lessonId)
      .single();
    
    if (quiz?.questions && quiz.questions.length > 0) {
      setQuizQuestions(quiz.questions);
    } else {
      setQuizQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
    }
    
    setEditingLessonId(lessonId);
    setStatus('');
  };

  const resetLessonForm = () => {
    setLessonForm({ 
      title: '', 
      description: '', 
      topic: 'Toán Học', 
      level: 1, 
      grade_level_id: '',
      introduction: '',
      key_points: [''],
      examples: [''],
      exercises: [''],
    });
    setQuizQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
    setEditingLessonId(null);
  };

  const createDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    const { error } = await supabase.from('documents').insert({
      title: documentForm.title,
      description: documentForm.description,
      topic: documentForm.topic,
      content: documentForm.content,
      document_type: documentForm.document_type,
      grade_level_id: documentForm.grade_level_id || null,
      author: profile?.id || null,
    });
    if (error) {
      setStatus(`Lỗi tạo tài liệu: ${error.message}`);
      return;
    }
    setStatus('Tạo tài liệu thành công');
    setDocumentForm({
      title: '',
      description: '',
      topic: 'Toán Học',
      content: '',
      document_type: 'theory',
      grade_level_id: '',
    });
    loadData();
    setTimeout(() => setStatus(''), 3000);
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      setStatus(`Xóa lesson lỗi: ${error.message}`);
      return;
    }
    loadData();
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      setStatus(`Xóa tài liệu lỗi: ${error.message}`);
      return;
    }
    loadData();
  };

  // File upload handler
  const handleFileUpload = async (documentId: string, file: File) => {
    setStatus(`Đang upload ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);

    try {
      const headers = await getAuthHeaders();
      // For FormData, don't set Content-Type - browser will set it with boundary
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': (headers as Record<string, string>)['Authorization'] || '',
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setStatus(`Đã upload ${file.name}. Đang xử lý...`);
      
      // Refresh data immediately
      loadData();
      
      // Check processing status after delay
      setTimeout(() => {
        loadData();
        setStatus(`Đã xử lý xong ${file.name}`);
      }, 5000);
      
    } catch (error) {
      setStatus(`Lỗi upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate lesson with RAG
  const generateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setStatus('🔍 Đang tìm kiếm tài liệu liên quan...');
    setGeneratedContent(null);

    try {
      const grade = grades.find(g => g.id === generateForm.grade_level_id);
      
      setStatus('🤖 Đang tạo bài học với AI...');
      
      const headers = await getAuthHeaders();
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: generateForm.topic,
          gradeLevel: grade?.grade || 1,
          subject: generateForm.subject,
          useRAG: generateForm.useRAG,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      setGeneratedContent(result.content);
      setStatus(`✅ Tạo bài học thành công (dùng ${result.generatedWith})`);
    } catch (error) {
      setStatus(`❌ Lỗi tạo bài học: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  // Create lesson from generated content
  const saveGeneratedLesson = async () => {
    if (!generatedContent) return;
    
    const { error } = await supabase.from('lessons').insert({
      title: generateForm.topic,
      description: generatedContent.introduction,
      topic: generateForm.subject,
      level: 1,
      order_index: 1,
      lesson_type: 'conversation',
      content: {
        introduction: generatedContent.introduction,
        key_points: generatedContent.key_points,
        examples: generatedContent.examples,
        exercises: generatedContent.exercises,
      },
      points_reward: 10,
      grade_level_id: generateForm.grade_level_id || null,
    });

    if (error) {
      setStatus(`Lỗi lưu lesson: ${error.message}`);
      return;
    }

    setStatus('Đã lưu bài học vào database!');
    setGeneratedContent(null);
    setGenerateForm({ topic: '', subject: 'Toán Học', grade_level_id: '', useRAG: true });
    loadData();
  };

  if (profile?.role !== 'web_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Không có quyền truy cập</h1>
          <p className="text-slate-600">Trang này chỉ dành cho web_admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
                <p className="text-sm text-slate-500">Quản lý nội dung học tập</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Settings className="w-4 h-4" />
              <span>Web Admin</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
          <div className="flex gap-2">
            <button 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                tab === 'lessons' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`} 
              onClick={() => setTab('lessons')}
            >
              <BookOpen className="w-4 h-4" />
              <span>Lessons</span>
            </button>
            <button 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                tab === 'documents' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`} 
              onClick={() => setTab('documents')}
            >
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </button>
            <button 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                tab === 'generate' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`} 
              onClick={() => setTab('generate')}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate (RAG)</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm text-slate-700">{status}</p>
          </div>
        )}

        {tab === 'lessons' ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Create Lesson Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    {editingLessonId ? <Edit className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {editingLessonId ? 'Cập nhật Lesson' : 'Tạo Lesson mới'}
                  </h2>
                </div>
                {editingLessonId && (
                  <button
                    type="button"
                    onClick={resetLessonForm}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Hủy</span>
                  </button>
                )}
              </div>
              <form onSubmit={createLesson} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tiêu đề</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                    placeholder="Nhập tiêu đề bài học" 
                    value={lessonForm.title} 
                    onChange={(e) => setLessonForm((s) => ({ ...s, title: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả ngắn</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                    placeholder="Mô tả ngắn về bài học" 
                    value={lessonForm.description} 
                    onChange={(e) => setLessonForm((s) => ({ ...s, description: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới thiệu (Introduction)</label>
                  <textarea 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                    rows={3}
                    placeholder="Giới thiệu chi tiết về bài học..."
                    value={lessonForm.introduction}
                    onChange={(e) => setLessonForm((s) => ({ ...s, introduction: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Chủ đề</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                    placeholder="Ví dụ: Toán Học, Ngữ Văn" 
                    value={lessonForm.topic} 
                    onChange={(e) => setLessonForm((s) => ({ ...s, topic: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Level</label>
                    <input 
                      type="number" 
                      min={1} 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                      placeholder="1-10" 
                      value={lessonForm.level} 
                      onChange={(e) => setLessonForm((s) => ({ ...s, level: Number(e.target.value) }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Lớp</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                      value={lessonForm.grade_level_id} 
                      onChange={(e) => setLessonForm((s) => ({ ...s, grade_level_id: e.target.value }))}
                    >
                      <option value="">Không phân lớp</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <span>Nội dung chính (Key Points)</span>
                  </label>
                  {lessonForm.key_points.map((point, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input 
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                        placeholder={`Điểm chính ${idx + 1}`}
                        value={point}
                        onChange={(e) => {
                          const newPoints = [...lessonForm.key_points];
                          newPoints[idx] = e.target.value;
                          setLessonForm((s) => ({ ...s, key_points: newPoints }));
                        }}
                      />
                      {lessonForm.key_points.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPoints = lessonForm.key_points.filter((_, i) => i !== idx);
                            setLessonForm((s) => ({ ...s, key_points: newPoints }));
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLessonForm((s) => ({ ...s, key_points: [...s.key_points, ''] }))}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm điểm chính</span>
                  </button>
                </div>

                {/* Examples */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <span>Ví dụ (Examples)</span>
                  </label>
                  {lessonForm.examples.map((example, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input 
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                        placeholder={`Ví dụ ${idx + 1}`}
                        value={example}
                        onChange={(e) => {
                          const newExamples = [...lessonForm.examples];
                          newExamples[idx] = e.target.value;
                          setLessonForm((s) => ({ ...s, examples: newExamples }));
                        }}
                      />
                      {lessonForm.examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newExamples = lessonForm.examples.filter((_, i) => i !== idx);
                            setLessonForm((s) => ({ ...s, examples: newExamples }));
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLessonForm((s) => ({ ...s, examples: [...s.examples, ''] }))}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm ví dụ</span>
                  </button>
                </div>

                {/* Exercises */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <span>Bài tập (Exercises)</span>
                  </label>
                  {lessonForm.exercises.map((exercise, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input 
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                        placeholder={`Bài tập ${idx + 1}`}
                        value={exercise}
                        onChange={(e) => {
                          const newExercises = [...lessonForm.exercises];
                          newExercises[idx] = e.target.value;
                          setLessonForm((s) => ({ ...s, exercises: newExercises }));
                        }}
                      />
                      {lessonForm.exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newExercises = lessonForm.exercises.filter((_, i) => i !== idx);
                            setLessonForm((s) => ({ ...s, exercises: newExercises }));
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLessonForm((s) => ({ ...s, exercises: [...s.exercises, ''] }))}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm bài tập</span>
                  </button>
                </div>

                {/* Quiz Questions */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <span>Câu hỏi trắc nghiệm (Quiz)</span>
                  </label>
                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 bg-slate-50 rounded-xl mb-3 border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-slate-700">Câu hỏi {qIdx + 1}</span>
                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newQuestions = quizQuestions.filter((_, i) => i !== qIdx);
                              setQuizQuestions(newQuestions);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all mb-3" 
                        placeholder="Nhập câu hỏi..."
                        value={q.question}
                        onChange={(e) => {
                          const newQuestions = [...quizQuestions];
                          newQuestions[qIdx].question = e.target.value;
                          setQuizQuestions(newQuestions);
                        }}
                      />
                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input 
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correctAnswer === optIdx}
                              onChange={() => {
                                const newQuestions = [...quizQuestions];
                                newQuestions[qIdx].correctAnswer = optIdx;
                                setQuizQuestions(newQuestions);
                              }}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <input 
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                              placeholder={`Đáp án ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newQuestions = [...quizQuestions];
                                newQuestions[qIdx].options[optIdx] = e.target.value;
                                setQuizQuestions(newQuestions);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <textarea 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                        rows={2}
                        placeholder="Giải thích đáp án đúng..."
                        value={q.explanation}
                        onChange={(e) => {
                          const newQuestions = [...quizQuestions];
                          newQuestions[qIdx].explanation = e.target.value;
                          setQuizQuestions(newQuestions);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }])}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm câu hỏi</span>
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {editingLessonId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingLessonId ? 'Cập nhật Lesson' : 'Tạo Lesson'}</span>
                </button>
              </form>
            </div>

            {/* Lessons List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Danh sách Lessons</h2>
                </div>
                <span className="text-sm text-slate-500">{lessons.length} lessons</span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-auto pr-2">
                {lessons.map((l) => (
                  <div key={l.id} className="group flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-200 border border-slate-200 hover:border-slate-300">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{l.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">{l.topic}</span>
                        <span className="text-xs text-slate-500">Level {l.level}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditLesson(l.id)} 
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteLesson(l.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {lessons.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Chưa có lesson nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : tab === 'documents' ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Create Document Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Tạo Tài liệu mới</h2>
              </div>
              <form onSubmit={createDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tiêu đề</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                    placeholder="Nhập tiêu đề tài liệu" 
                    value={documentForm.title} 
                    onChange={(e) => setDocumentForm((s) => ({ ...s, title: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                    placeholder="Mô tả ngắn về tài liệu" 
                    value={documentForm.description} 
                    onChange={(e) => setDocumentForm((s) => ({ ...s, description: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Chủ đề</label>
                  <input 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                    placeholder="Ví dụ: Toán Học, Ngữ Văn" 
                    value={documentForm.topic} 
                    onChange={(e) => setDocumentForm((s) => ({ ...s, topic: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung</label>
                  <textarea 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                    rows={4} 
                    placeholder="Nhập nội dung tài liệu" 
                    value={documentForm.content} 
                    onChange={(e) => setDocumentForm((s) => ({ ...s, content: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại tài liệu</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                      value={documentForm.document_type} 
                      onChange={(e) => setDocumentForm((s) => ({ ...s, document_type: e.target.value }))}
                    >
                      <option value="theory">Theory</option>
                      <option value="exercise">Exercise</option>
                      <option value="reference">Reference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Lớp</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                      value={documentForm.grade_level_id} 
                      onChange={(e) => setDocumentForm((s) => ({ ...s, grade_level_id: e.target.value }))}
                    >
                      <option value="">Không phân lớp</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Tài liệu</span>
                </button>
              </form>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Danh sách Tài liệu</h2>
                </div>
                <span className="text-sm text-slate-500">{documents.length} tài liệu</span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-auto pr-2">
                {documents.map((d) => (
                  <div key={d.id} className="group p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-200 border border-slate-200 hover:border-slate-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{d.topic}</span>
                          <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded-full">{d.document_type}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteDocument(d.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="flex items-center gap-2 mb-3">
                      {d.has_chunks ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Đã xử lý</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Chưa có file</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Source files list */}
                    {docSourceFiles[d.id]?.length > 0 && (
                      <div className="bg-white p-3 rounded-lg text-xs space-y-2 border border-slate-200">
                        <p className="font-medium text-slate-700">Files đã upload:</p>
                        {docSourceFiles[d.id].map((sf) => (
                          <div key={sf.id} className="flex justify-between items-center">
                            <span className="text-slate-600">{sf.file_name}</span>
                            <div className="flex items-center gap-1">
                              {sf.processing_status === 'completed' ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              ) : sf.processing_status === 'failed' ? (
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(d.id, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload file</span>
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Chưa có tài liệu nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Generate Lesson with RAG
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Generate Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Generate Lesson với RAG</h2>
                    <p className="text-sm text-slate-500">AI tạo bài học từ tài liệu đã upload</p>
                  </div>
                </div>
                <form onSubmit={generateLesson} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Chủ đề bài học</label>
                    <input 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                      placeholder="Ví dụ: Phân số, Phương trình bậc 2..." 
                      value={generateForm.topic}
                      onChange={(e) => setGenerateForm((s) => ({ ...s, topic: e.target.value }))}
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Môn học</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      value={generateForm.subject}
                      onChange={(e) => setGenerateForm((s) => ({ ...s, subject: e.target.value }))}
                    >
                      <option value="Toán Học">Toán Học</option>
                      <option value="Ngữ Văn">Ngữ Văn</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Vật Lý">Vật Lý</option>
                      <option value="Hóa Học">Hóa Học</option>
                      <option value="Sinh Học">Sinh Học</option>
                      <option value="Lịch Sử">Lịch Sử</option>
                      <option value="Địa Lý">Địa Lý</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Lớp</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                      value={generateForm.grade_level_id} 
                      onChange={(e) => setGenerateForm((s) => ({ ...s, grade_level_id: e.target.value }))}
                      required
                    >
                      <option value="">Chọn lớp</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="checkbox" 
                      checked={generateForm.useRAG}
                      onChange={(e) => setGenerateForm((s) => ({ ...s, useRAG: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-700">Dùng RAG (tìm kiếm trong tài liệu)</span>
                  </label>
                  
                  <button 
                    type="submit" 
                    disabled={generating}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo bài học</span>
                      </>
                    )}
                  </button>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                    <p className="font-medium text-purple-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>💡 Tips:</span>
                    </p>
                    <ul className="text-purple-700 space-y-1 mt-2 text-sm">
                      <li>• Upload SGK/SBT vào tab Documents trước</li>
                      <li>• Chọn đúng lớp để AI tìm tài liệu phù hợp</li>
                      <li>• Nội dung sẽ bám sát chương trình VN</li>
                    </ul>
                  </div>
                </form>
              </div>

              {/* Available documents */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Tài liệu có sẵn</h3>
                  <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-full">{documents.filter(d => d.has_chunks).length}</span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-auto pr-2">
                  {documents.filter(d => d.has_chunks).map((d) => (
                    <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{d.title}</span>
                      <span className="text-xs text-slate-500">
                        {grades.find(g => g.id === d.grade_level_id)?.label || 'Không phân lớp'}
                      </span>
                    </div>
                  ))}
                  {documents.filter(d => d.has_chunks).length === 0 && (
                    <div className="text-center py-6 text-slate-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Chưa có tài liệu nào được xử lý</p>
                      <p className="text-xs mt-1">Upload file PDF/Word/Ảnh ở tab Documents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generated content preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Xem trước nội dung</h2>
              </div>
              
              {generating ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">AI đang đọc tài liệu và tạo bài học...</p>
                  <p className="text-sm text-slate-400 mt-2">Quá trình này có thể mất vài giây</p>
                </div>
              ) : generatedContent ? (
                <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Giới thiệu</span>
                    </h3>
                    <p className="text-sm text-green-700">{generatedContent.introduction}</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>Nội dung chính</span>
                    </h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                      {generatedContent.key_points.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <h3 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Ví dụ</span>
                    </h3>
                    <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                      {generatedContent.examples.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                    <h3 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Bài tập</span>
                    </h3>
                    <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                      {generatedContent.exercises.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  
                  <button 
                    onClick={saveGeneratedLesson}
                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu bài học vào database</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>Nội dung bài học sẽ hiển thị ở đây sau khi tạo</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedPageWrapper>
      <AdminContent />
    </ProtectedPageWrapper>
  );
}
