import { NextResponse } from 'next/server';
import { generateLessonWithRAG } from '@/lib/rag';
import { createServiceSupabase } from '@/lib/db/server';
import { getAuth } from '@/lib/auth-headers';

export async function POST(request: Request) {
  try {
    // Check auth
    const auth = await getAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      topic, 
      gradeLevel, 
      subject, 
      useRAG = true,
    } = body;

    if (!topic || !gradeLevel || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, gradeLevel, subject' },
        { status: 400 }
      );
    }

    let content: {
      introduction: string;
      key_points: string[];
      examples: string[];
      exercises: string[];
    };
    let sources: Awaited<ReturnType<typeof generateLessonWithRAG>>['sources'] | null = null;

    console.log(`[Lesson Generation] Starting: topic="${topic}", grade=${gradeLevel}, subject=${subject}, useRAG=${useRAG}`);

    if (useRAG) {
      try {
        console.log('[Lesson Generation] Searching documents with RAG...');
        // Try to generate with RAG
        const result = await generateLessonWithRAG(topic, gradeLevel, subject, {
          matchCount: 5,
        });
        console.log(`[Lesson Generation] Found ${result.sources.length} relevant chunks`);
        console.log('[Lesson Generation] Generating lesson with AI...');
        content = result.content;
        sources = result.sources;
        console.log('[Lesson Generation] RAG generation completed');
      } catch (ragError) {
        console.warn('[Lesson Generation] RAG failed, falling back to direct generation:', ragError);
        // Fall back to direct generation
        console.log('[Lesson Generation] Generating lesson directly (no RAG)...');
        content = await generateLessonDirect(topic, gradeLevel, subject);
        console.log('[Lesson Generation] Direct generation completed');
      }
    } else {
      // Direct generation without RAG
      console.log('[Lesson Generation] Generating lesson directly (RAG disabled)...');
      content = await generateLessonDirect(topic, gradeLevel, subject);
      console.log('[Lesson Generation] Direct generation completed');
    }

    return NextResponse.json({
      success: true,
      content,
      sources: sources?.map(s => ({
        documentId: s.document_id,
        chunkText: s.chunk_text.substring(0, 200) + '...',
        similarity: s.similarity,
      })) || null,
      generatedWith: useRAG ? (sources ? 'RAG' : 'RAG_FALLBACK') : 'DIRECT',
    });

  } catch (error) {
    console.error('Lesson generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

async function generateLessonDirect(
  topic: string,
  gradeLevel: number,
  subject: string
): Promise<{
  introduction: string;
  key_points: string[];
  examples: string[];
  exercises: string[];
}> {
  console.log(`[Direct Generation] Generating lesson for: ${topic}, class ${gradeLevel}`);
  
  const prompt = `Bạn là giáo viên chuyên nghiệp dạy môn ${subject} tại Việt Nam.

Nhiệm vụ: Tạo nội dung bài học cho chủ đề "${topic}" dành cho học sinh lớp ${gradeLevel}.

Tạo nội dung bài học theo cấu trúc JSON sau:
{
  "introduction": "Giới thiệu ngắn gọn về bài học (2-3 câu)",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3"],
  "examples": ["Ví dụ minh họa 1", "Ví dụ minh họa 2"],
  "exercises": ["Bài tập 1", "Bài tập 2"]
}

Yêu cầu:
- Ngôn ngữ: Tiếng Việt
- Cấp độ: Phù hợp lớp ${gradeLevel}
- Nội dung: Theo chương trình giáo dục phổ thông Việt Nam
- Phong cách: Dễ hiểu, có ví dụ thực tế

Chỉ trả về JSON, không có text khác.`;

  console.log('[Direct Generation] Calling Gemini API...');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  console.log('[Direct Generation] Parsing response...');

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to generate valid lesson content');
  }

  return JSON.parse(jsonMatch[0]);
}

// Preview available documents for a topic/grade
export async function GET(request: Request) {
  try {
    const auth = await getAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const gradeLevel = searchParams.get('gradeLevel');

    const supabase = createServiceSupabase();

    let query = supabase
      .from('documents')
      .select('id, title, topic, document_type, grade_level_id')
      .order('created_at', { ascending: false });

    if (topic) {
      query = query.ilike('topic', `%${topic}%`);
    }

    if (gradeLevel) {
      query = query.eq('grade_level_id', gradeLevel);
    }

    const { data: documents, error } = await query.limit(20);

    if (error) {
      throw new Error(error.message);
    }

    // Get chunk counts for each document
    const documentsWithChunks = await Promise.all(
      (documents || []).map(async (doc) => {
        const { count } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        return {
          ...doc,
          hasEmbeddings: count && count > 0,
          chunkCount: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      documents: documentsWithChunks,
    });

  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
