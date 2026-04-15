'use client';

import { useEffect, useState } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';

type GradeLevel = { id: string; grade: number; label: string };
type Lesson = { id: string; title: string; topic: string; level: number };
type DocumentItem = { id: string; title: string; topic: string; document_type: string };

function AdminContent() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'lessons' | 'documents'>('lessons');
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState('');

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

  const loadData = async () => {
    const [{ data: gradeData }, { data: lessonData }, { data: docData }] = await Promise.all([
      supabase.from('grade_levels').select('id, grade, label').order('grade', { ascending: true }),
      supabase.from('lessons').select('id, title, topic, level').order('created_at', { ascending: false }).limit(50),
      supabase.from('documents').select('id, title, topic, document_type').order('created_at', { ascending: false }).limit(50),
    ]);
    setGrades((gradeData ?? []) as GradeLevel[]);
    setLessons((lessonData ?? []) as Lesson[]);
    setDocuments((docData ?? []) as DocumentItem[]);
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
        <div className="flex gap-2">
          <button className={`px-4 py-2 rounded ${tab === 'lessons' ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => setTab('lessons')}>Lessons</button>
          <button className={`px-4 py-2 rounded ${tab === 'documents' ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => setTab('documents')}>Documents</button>
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
        ) : (
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
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {documents.map((d) => (
                  <div key={d.id} className="flex justify-between items-center border p-2 rounded">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-gray-500">{d.topic} - {d.document_type}</p>
                    </div>
                    <button onClick={() => deleteDocument(d.id)} className="text-red-600 text-sm">Xóa</button>
                  </div>
                ))}
              </div>
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
