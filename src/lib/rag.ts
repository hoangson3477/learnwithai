import { createServiceSupabase } from '@/lib/db/server';
import genAI from '@/lib/gemini';

const CHUNK_SIZE = 1500;     // Characters per chunk
const CHUNK_OVERLAP = 200;   // Overlap between chunks

export interface ChunkMatch {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface RAGQueryResult {
  chunks: ChunkMatch[];
  combinedContext: string;
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to end at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const boundary = Math.max(lastPeriod, lastNewline);
      if (boundary > chunkSize * 0.5) {
        chunk = chunk.slice(0, boundary + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start = end - overlap;
  }
  
  return chunks.filter(c => c.length > 50);
}

/**
 * Generate embedding using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Store document chunks with embeddings
 */
export async function storeDocumentChunks(
  documentId: string,
  chunks: string[],
  metadata: { page?: number; section?: string }[] = []
): Promise<void> {
  const supabase = createServiceSupabase();
  
  const records = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk);
      return {
        document_id: documentId,
        chunk_text: chunk,
        embedding,
        chunk_index: index,
        metadata: metadata[index] || {},
      };
    })
  );
  
  const { error } = await supabase.from('document_chunks').insert(records);
  
  if (error) {
    throw new Error(`Failed to store chunks: ${error.message}`);
  }
}

/**
 * Search similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filterDocumentIds?: string[];
  } = {}
): Promise<ChunkMatch[]> {
  const { matchThreshold = 0.5, matchCount = 5, filterDocumentIds } = options;
  
  const supabase = createServiceSupabase();
  const queryEmbedding = await generateEmbedding(query);
  
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_document_ids: filterDocumentIds || null,
  });
  
  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }
  
  return (data || []) as ChunkMatch[];
}

/**
 * Get context for lesson generation from documents
 */
export async function getLessonContext(
  topic: string,
  gradeLevel?: number,
  options: {
    matchCount?: number;
    matchThreshold?: number;
  } = {}
): Promise<RAGQueryResult> {
  const supabase = createServiceSupabase();
  
  // Build search query
  let searchQuery = topic;
  if (gradeLevel) {
    searchQuery += ` lớp ${gradeLevel}`;
  }
  
  // Find relevant documents by grade level if specified
  let filterDocumentIds: string[] | undefined;
  if (gradeLevel) {
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('grade_level_id', gradeLevel);
    filterDocumentIds = docs?.map(d => d.id);
  }
  
  // Search for relevant chunks
  const chunks = await searchSimilarChunks(searchQuery, {
    ...options,
    filterDocumentIds,
  });
  
  // Combine chunks into context
  const combinedContext = chunks
    .map((c, i) => `[${i + 1}] ${c.chunk_text}`)
    .join('\n\n');
  
  return { chunks, combinedContext };
}

/**
 * Generate lesson content using RAG
 */
export async function generateLessonWithRAG(
  topic: string,
  gradeLevel: number,
  subject: string,
  options: {
    matchCount?: number;
  } = {}
): Promise<{
  content: {
    introduction: string;
    key_points: string[];
    examples: string[];
    exercises: string[];
  };
  sources: ChunkMatch[];
}> {
  const { chunks, combinedContext } = await getLessonContext(topic, gradeLevel, options);
  
  if (chunks.length === 0) {
    throw new Error('No relevant documents found for this topic and grade level');
  }
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Bạn là giáo viên chuyên nghiệp dạy môn ${subject} tại Việt Nam.

Nhiệm vụ: Tạo nội dung bài học cho chủ đề "${topic}" dành cho học sinh lớp ${gradeLevel}.

QUAN TRỌNG: Chỉ sử dụng thông tin từ các tài liệu chính thống dưới đây. Không thêm kiến thức bên ngoài.

TÀI LIỆU THAM KHẢO:
${combinedContext}

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
- Nội dung: Dựa HOÀN TOÀN trên tài liệu tham khảo
- Phong cách: Dễ hiểu, có ví dụ thực tế`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to generate valid lesson content');
  }
  
  const content = JSON.parse(jsonMatch[0]);
  
  return { content, sources: chunks };
}

/**
 * Delete all chunks for a document
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const supabase = createServiceSupabase();
  
  const { error } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);
  
  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`);
  }
}

/**
 * Reprocess document chunks (useful when updating content)
 */
export async function reprocessDocument(
  documentId: string,
  fullText: string,
  metadata: { page?: number; section?: string }[] = []
): Promise<void> {
  // Delete old chunks
  await deleteDocumentChunks(documentId);
  
  // Create new chunks
  const chunks = chunkText(fullText);
  
  // Store new chunks
  await storeDocumentChunks(documentId, chunks, metadata);
}
