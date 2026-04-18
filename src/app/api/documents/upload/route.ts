import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/db/server';
import { chunkText, generateEmbedding } from '@/lib/rag';
import { getAuth } from '@/lib/auth-headers';

// Text extraction libraries (dynamic import to reduce startup time)
async function extractFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await import('pdf-parse') as unknown as { default: (buffer: Buffer) => Promise<{ text: string }> };
  const result = await pdf.default(buffer);
  return result.text;
}

async function extractFromWord(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mammoth = await import('mammoth') as unknown as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_GEMINI_API_KEY');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const base64Data = buffer.toString('base64');
  
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
    { text: 'Trích xuất toàn bộ văn bản từ hình ảnh này. Giữ nguyên cấu trúc và định dạng nếu có thể.' },
  ]);
  
  return result.response.text();
}

export async function POST(request: Request) {
  try {
    // Check auth
    const auth = await getAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceSupabase();

    // Verify admin role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', auth.userId)
      .single();

    if (user?.role !== 'web_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;

    if (!file || !documentId) {
      return NextResponse.json(
        { error: 'Missing file or documentId' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.name.toLowerCase().split('.').pop();
    const allowedTypes = ['pdf', 'docx', 'doc', 'jpg', 'jpeg', 'png'];
    
    if (!fileType || !allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${documentId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-files')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('document-files')
      .getPublicUrl(fileName);

    // Create source file record
    const { data: sourceFile, error: dbError } = await supabase
      .from('document_source_files')
      .insert({
        document_id: documentId,
        file_name: file.name,
        file_type: fileType,
        storage_path: fileName,
        file_size: file.size,
        processing_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to create source file record: ${dbError.message}`);
    }

    // Process file in background
    void processFile(documentId, sourceFile.id, fileName, fileType);

    return NextResponse.json({
      success: true,
      sourceFile: {
        id: sourceFile.id,
        fileName: file.name,
        fileType,
        storagePath: fileName,
        status: 'processing',
      },
      message: 'File uploaded and processing started',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Background file processing
async function processFile(
  documentId: string,
  sourceFileId: string,
  storagePath: string,
  fileType: string
): Promise<void> {
  const supabase = createServiceSupabase();

  try {
    // Update status to processing
    await supabase
      .from('document_source_files')
      .update({ processing_status: 'processing' })
      .eq('id', sourceFileId);

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('document-files')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text based on file type
    let extractedText = '';
    
    switch (fileType) {
      case 'pdf':
        extractedText = await extractFromPDF(buffer);
        break;
      case 'docx':
      case 'doc':
        extractedText = await extractFromWord(buffer);
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        extractedText = await extractFromImage(buffer, fileData.type);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the file');
    }

    // Chunk text
    const chunks = chunkText(extractedText);

    // Store chunks with embeddings
    const records = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await generateEmbedding(chunk);
        return {
          document_id: documentId,
          chunk_text: chunk,
          embedding,
          chunk_index: index,
          metadata: { source_file_id: sourceFileId },
        };
      })
    );

    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(records);

    if (insertError) {
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    // Update source file record
    await supabase
      .from('document_source_files')
      .update({
        processing_status: 'completed',
        extracted_text: extractedText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceFileId);

    console.log(`Processed file ${sourceFileId}: ${chunks.length} chunks created`);

  } catch (error) {
    console.error('Processing error:', error);
    
    // Update status to failed
    await supabase
      .from('document_source_files')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceFileId);
  }
}
