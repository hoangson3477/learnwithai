import { createServiceSupabase } from '@/lib/db/server';

const CHUNK_SIZE = 3000;     // Characters per chunk
const CHUNK_OVERLAP = 300;   // Overlap between chunks

export interface ChunkMatch {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  rank: number; // Text search rank instead of similarity
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
  const maxChunks = 1000; // Safety limit
  let chunkCount = 0;
  let lastStart = -1; // Track last start position to detect infinite loop
  
  // Ensure overlap is smaller than chunk size
  const safeOverlap = Math.min(overlap, chunkSize - 100);
  
  console.log(`[chunkText] Total text length: ${text.length}, chunkSize: ${chunkSize}, overlap: ${safeOverlap}`);
  
  while (start < text.length && chunkCount < maxChunks) {
    // Detect infinite loop
    if (start === lastStart) {
      console.warn(`[chunkText] Infinite loop detected at start=${start}, breaking`);
      break;
    }
    lastStart = start;
    
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
    
    const trimmed = chunk.trim();
    if (trimmed.length > 50) {
      chunks.push(trimmed);
      chunkCount++;
      console.log(`[chunkText] Chunk ${chunkCount}: start=${start}, end=${end}, length=${trimmed.length}, first 100 chars: "${trimmed.substring(0, 100)}"`);
    }
    
    // Move start forward - ensure it always increases
    const newStart = end - safeOverlap;
    if (newStart <= start) {
      start = end; // Fallback: move to end if overlap doesn't advance
    } else {
      start = newStart;
    }
  }
  
  console.log(`[chunkText] Total chunks created: ${chunks.length}`);
  
  // Check for duplicates
  const uniqueChunks = new Set(chunks);
  if (uniqueChunks.size !== chunks.length) {
    console.warn(`[chunkText] WARNING: Found ${chunks.length - uniqueChunks.size} duplicate chunks!`);
  }
  
  return chunks;
}

/**
 * Store document chunks (text-based, no embeddings)
 */
export async function storeDocumentChunks(
  documentId: string,
  chunks: string[],
  metadata: { page?: number; section?: string }[] = []
): Promise<void> {
  const supabase = createServiceSupabase();
  
  const records = chunks.map((chunk, index) => ({
    document_id: documentId,
    chunk_text: chunk,
    chunk_index: index,
    metadata: metadata[index] || {},
  }));
  
  const { error } = await supabase.from('document_chunks').insert(records);
  
  if (error) {
    throw new Error(`Failed to store chunks: ${error.message}`);
  }
}

/**
 * Search chunks using PostgreSQL full-text search
 */
export async function searchSimilarChunks(
  query: string,
  options: {
    matchCount?: number;
    filterDocumentIds?: string[];
  } = {}
): Promise<ChunkMatch[]> {
  const { matchCount = 5, filterDocumentIds } = options;
  
  const supabase = createServiceSupabase();
  
  let dbQuery = supabase
    .from('document_chunks')
    .select('id, document_id, chunk_text, chunk_index, metadata')
    .textSearch('chunk_text', query, {
      type: 'websearch',
    })
    .limit(matchCount);
  
  if (filterDocumentIds && filterDocumentIds.length > 0) {
    dbQuery = dbQuery.in('document_id', filterDocumentIds);
  }
  
  const { data, error } = await dbQuery;
  
  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }
  
  return (data || []).map((c, i) => ({ ...c, rank: i })) as ChunkMatch[];
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
  console.log(`[RAG] Getting context for topic: "${topic}", grade: ${gradeLevel}`);
  const supabase = createServiceSupabase();
  
  // Build search query - only use topic, don't add grade level
  const searchQuery = topic;
  console.log(`[RAG] Search query: "${searchQuery}"`);
  
  // Find relevant documents by grade level if specified
  let filterDocumentIds: string[] | undefined;
  if (gradeLevel) {
    console.log(`[RAG] Filtering documents by grade level: ${gradeLevel}`);
    
    // First, get the UUID for this grade level
    const { data: gradeLevelData, error: gradeError } = await supabase
      .from('grade_levels')
      .select('id')
      .eq('grade', gradeLevel)
      .single();
    
    if (gradeError) {
      console.error(`[RAG] Error getting grade level UUID:`, gradeError);
    } else {
      console.log(`[RAG] Grade level UUID: ${gradeLevelData?.id}`);
      
      // Then filter documents by UUID
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, grade_level_id')
        .eq('grade_level_id', gradeLevelData?.id);
      
      if (docsError) {
        console.error(`[RAG] Error filtering documents by grade:`, docsError);
      }
      
      filterDocumentIds = docs?.map(d => d.id);
      console.log(`[RAG] Found ${filterDocumentIds?.length || 0} documents for grade ${gradeLevel}`);
      console.log(`[RAG] Document IDs: ${filterDocumentIds?.join(', ') || 'none'}`);
    }
    
    // Fallback: if no documents for this grade, search all documents
    if (!filterDocumentIds || filterDocumentIds.length === 0) {
      console.log(`[RAG] No documents for grade ${gradeLevel}, searching all documents`);
      filterDocumentIds = undefined;
    }
  }
  
  // Search for relevant chunks
  console.log(`[RAG] Searching chunks...`);
  const chunks = await searchSimilarChunks(searchQuery, {
    ...options,
    filterDocumentIds,
  });
  console.log(`[RAG] Found ${chunks.length} relevant chunks`);
  
  // Combine chunks into context
  const combinedContext = chunks
    .map((c, i) => `[${i + 1}] ${c.chunk_text}`)
    .join('\n\n');
  
  console.log(`[RAG] Combined context length: ${combinedContext.length} chars`);
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
- Phong cách: Dễ hiểu, có ví dụ thực tế

Chỉ trả về JSON, không có text khác.`;

  // Use Gemini for generation (better quality, no rate limit)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
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
