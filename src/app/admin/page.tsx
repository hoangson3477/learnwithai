'use client';

import { useEffect, useState, useRef } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { getAuthHeaders } from '@/lib/auth-headers';

type GradeLevel = { id: string; grade: number; label: string };
type Lesson = { id: string; title: string; topic: string; level: number };
type DocumentItem = { id: string; title: string; topic: string; document_type: string; grade_level_id?: string; has_chunks?: boolean };
type SourceFile = { id: string; file_name: string; file_type: string; processing_status: string; error_message?: string };

function AdminContent() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'lessons' | 'documents' | 'generate'>('lessons');
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [docSourceFiles, setDocSourceFiles] = useState<Record<string, SourceFile[]>>({});
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    topic: 'Toán Học',
    level: 1,
    grade_level_id: '',
  });

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
    const { error } = await supabase.from('lessons').insert({
      title: lessonForm.title,
      description: lessonForm.description,
      topic: lessonForm.topic,
      level: lessonForm.level,
      order_index: lessonForm.level,
      lesson_type: 'conversation',
      content: { introduction: lessonForm.description, key_points: ['Nội dung sẽ cập nhật'] },
      points_reward: 10,
      grade_level_id: lessonForm.grade_level_id || null,
    });
    if (error) {
      setStatus(`Lỗi tạo lesson: ${error.message}`);
      return;
    }
    setStatus('Tạo lesson thành công');
    setLessonForm({ title: '', description: '', topic: 'Toán Học', level: 1, grade_level_id: '' });
    loadData();
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
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setStatus(`Đã upload ${file.name}. Đang xử lý...`);
      
      // Refresh after a few seconds
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
    setStatus('Đang tạo bài học từ tài liệu...');
    setGeneratedContent(null);

    try {
      const grade = grades.find(g => g.id === generateForm.grade_level_id);
      
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
      setStatus(`Tạo bài học thành công (dùng ${result.generatedWith})`);
    } catch (error) {
      setStatus(`Lỗi tạo bài học: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-600">Trang này chỉ dành cho web_admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Admin mini - Quản lý nội dung</h1>
        <div className="flex gap-2 flex-wrap">
          <button className={`px-4 py-2 rounded ${tab === 'lessons' ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => setTab('lessons')}>Lessons</button>
          <button className={`px-4 py-2 rounded ${tab === 'documents' ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => setTab('documents')}>Documents</button>
          <button className={`px-4 py-2 rounded ${tab === 'generate' ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => setTab('generate')}>Generate (RAG)</button>
        </div>
        {status && <p className="text-sm text-indigo-700">{status}</p>}

        {tab === 'lessons' ? (
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={createLesson} className="bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="font-semibold">Tạo lesson</h2>
              <input className="w-full border p-2 rounded" placeholder="Tiêu đề" value={lessonForm.title} onChange={(e) => setLessonForm((s) => ({ ...s, title: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Mô tả" value={lessonForm.description} onChange={(e) => setLessonForm((s) => ({ ...s, description: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Chủ đề" value={lessonForm.topic} onChange={(e) => setLessonForm((s) => ({ ...s, topic: e.target.value }))} required />
              <input type="number" min={1} className="w-full border p-2 rounded" placeholder="Level" value={lessonForm.level} onChange={(e) => setLessonForm((s) => ({ ...s, level: Number(e.target.value) }))} />
              <select className="w-full border p-2 rounded" value={lessonForm.grade_level_id} onChange={(e) => setLessonForm((s) => ({ ...s, grade_level_id: e.target.value }))}>
                <option value="">Không phân lớp</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">Tạo lesson</button>
            </form>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">Danh sách lesson</h2>
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {lessons.map((l) => (
                  <div key={l.id} className="flex justify-between items-center border p-2 rounded">
                    <div>
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-gray-500">{l.topic} - level {l.level}</p>
                    </div>
                    <button onClick={() => deleteLesson(l.id)} className="text-red-600 text-sm">Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tab === 'documents' ? (
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={createDocument} className="bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="font-semibold">Tạo tài liệu</h2>
              <input className="w-full border p-2 rounded" placeholder="Tiêu đề" value={documentForm.title} onChange={(e) => setDocumentForm((s) => ({ ...s, title: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Mô tả" value={documentForm.description} onChange={(e) => setDocumentForm((s) => ({ ...s, description: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Chủ đề" value={documentForm.topic} onChange={(e) => setDocumentForm((s) => ({ ...s, topic: e.target.value }))} required />
              <textarea className="w-full border p-2 rounded" rows={4} placeholder="Nội dung" value={documentForm.content} onChange={(e) => setDocumentForm((s) => ({ ...s, content: e.target.value }))} required />
              <select className="w-full border p-2 rounded" value={documentForm.document_type} onChange={(e) => setDocumentForm((s) => ({ ...s, document_type: e.target.value }))}>
                <option value="theory">Theory</option>
                <option value="exercise">Exercise</option>
                <option value="reference">Reference</option>
              </select>
              <select className="w-full border p-2 rounded" value={documentForm.grade_level_id} onChange={(e) => setDocumentForm((s) => ({ ...s, grade_level_id: e.target.value }))}>
                <option value="">Không phân lớp</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">Tạo tài liệu</button>
            </form>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">Danh sách tài liệu</h2>
              <div className="space-y-3 max-h-[500px] overflow-auto">
                {documents.map((d) => (
                  <div key={d.id} className="border p-3 rounded space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-gray-500">{d.topic} - {d.document_type}</p>
                        <p className="text-xs">
                          {d.has_chunks ? (
                            <span className="text-green-600">✓ Có embeddings</span>
                          ) : (
                            <span className="text-orange-600">✗ Chưa có file</span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => deleteDocument(d.id)} className="text-red-600 text-sm">Xóa</button>
                    </div>
                    
                    {/* Source files list */}
                    {docSourceFiles[d.id]?.length > 0 && (
                      <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                        <p className="font-medium">Files đã upload:</p>
                        {docSourceFiles[d.id].map((sf) => (
                          <div key={sf.id} className="flex justify-between items-center">
                            <span>{sf.file_name} ({sf.file_type})</span>
                            <span className={
                              sf.processing_status === 'completed' ? 'text-green-600' :
                              sf.processing_status === 'failed' ? 'text-red-600' :
                              'text-yellow-600'
                            }>
                              {sf.processing_status === 'completed' ? '✓' :
                               sf.processing_status === 'failed' ? '✗' : '⏳'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload button */}
                    <div className="flex gap-2">
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
                          setSelectedDoc(d.id);
                          fileInputRef.current?.click();
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        📎 Upload file
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Generate Lesson with RAG
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <form onSubmit={generateLesson} className="bg-white rounded-lg shadow p-4 space-y-4">
                <h2 className="font-semibold">Generate Lesson với RAG</h2>
                <p className="text-sm text-gray-600">
                  AI sẽ tạo bài học dựa trên tài liệu đã upload (SGK, SBT, đề thi...)
                </p>
                
                <input 
                  className="w-full border p-2 rounded" 
                  placeholder="Chủ đề bài học (vd: Phân số, Phương trình bậc 2...)" 
                  value={generateForm.topic}
                  onChange={(e) => setGenerateForm((s) => ({ ...s, topic: e.target.value }))}
                  required 
                />
                
                <select 
                  className="w-full border p-2 rounded"
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
                
                <select 
                  className="w-full border p-2 rounded" 
                  value={generateForm.grade_level_id} 
                  onChange={(e) => setGenerateForm((s) => ({ ...s, grade_level_id: e.target.value }))}
                  required
                >
                  <option value="">Chọn lớp</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
                
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={generateForm.useRAG}
                    onChange={(e) => setGenerateForm((s) => ({ ...s, useRAG: e.target.checked }))}
                  />
                  <span className="text-sm">Dùng RAG (tìm kiếm trong tài liệu)</span>
                </label>
                
                <button 
                  type="submit" 
                  disabled={generating}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
                >
                  {generating ? 'Đang tạo...' : '🤖 Tạo bài học'}
                </button>
                
                <div className="bg-blue-50 p-3 rounded text-sm">
                  <p className="font-medium text-blue-800">💡 Tip:</p>
                  <ul className="text-blue-700 space-y-1 mt-1">
                    <li>• Upload SGK/SBT vào tab Documents trước</li>
                    <li>• Chọn đúng lớp để AI tìm tài liệu phù hợp</li>
                    <li>• Nội dung sẽ bám sát chương trình VN</li>
                  </ul>
                </div>
              </form>

              {/* Available documents */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-2">Tài liệu có sẵn ({documents.filter(d => d.has_chunks).length})</h3>
                <div className="space-y-1 max-h-[200px] overflow-auto text-sm">
                  {documents.filter(d => d.has_chunks).map((d) => (
                    <div key={d.id} className="flex justify-between text-xs">
                      <span>{d.title}</span>
                      <span className="text-gray-500">
                        {grades.find(g => g.id === d.grade_level_id)?.label || 'Không phân lớp'}
                      </span>
                    </div>
                  ))}
                  {documents.filter(d => d.has_chunks).length === 0 && (
                    <p className="text-gray-500 text-xs">Chưa có tài liệu nào được xử lý. Upload file PDF/Word/Ảnh ở tab Documents.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Generated content preview */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">Xem trước nội dung</h2>
              
              {generating ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">AI đang đọc tài liệu và tạo bài học...</p>
                </div>
              ) : generatedContent ? (
                <div className="space-y-4 max-h-[500px] overflow-auto">
                  <div>
                    <h3 className="font-medium text-green-700">Giới thiệu</h3>
                    <p className="text-sm">{generatedContent.introduction}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-green-700">Nội dung chính</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {generatedContent.key_points.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-green-700">Ví dụ</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {generatedContent.examples.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-green-700">Bài tập</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {generatedContent.exercises.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  
                  <button 
                    onClick={saveGeneratedLesson}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded mt-4"
                  >
                    💾 Lưu bài học vào database
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nội dung bài học sẽ hiển thị ở đây sau khi tạo
                </p>
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
