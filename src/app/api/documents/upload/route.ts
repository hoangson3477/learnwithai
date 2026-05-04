import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/db/server';
import { chunkText } from '@/lib/rag';
import { getAuth } from '@/lib/auth-headers';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Tesseract = require('tesseract.js');

// OCR with Tesseract.js (free, offline) - optimized to release memory
async function ocrWithTesseract(imageBuffer: Buffer): Promise<string> {
  const worker = await Tesseract.createWorker('vie');
  try {
    const result = await worker.recognize(imageBuffer);
    return result.data.text;
  } finally {
    await worker.terminate(); // Release memory
  }
}

// Try text-based extraction first, then OCR if needed
async function extractFromPDF(buffer: Buffer): Promise<string> {
  // Method 1: Try direct text extraction (for text-based PDFs)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    const text = result.text?.trim() || '';
    
    console.log(`PDF text extraction: ${text.length} chars, first 200 chars: "${text.substring(0, 200)}"`);
    
    // If we got substantial text, use it
    if (text.length > 100) {
      console.log('PDF extracted via text-based method');
      return text;
    }
  } catch {
    console.log('Text-based PDF extraction failed, trying OCR...');
  }
  
  // Method 2: OCR for scanned/image PDFs (convert to images)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pdf } = require('pdf-to-img');
    
    const pages = await pdf(buffer, { scale: 1.5 });
    const texts: string[] = [];
    const maxPages = 50; // Increased to process full documents
    let pageCount = 0;
    
    for await (const image of pages) {
      pageCount++;
      if (pageCount > maxPages) break;
      
      try {
        const worker = await Tesseract.createWorker('vie');
        try {
          const result = await worker.recognize(image);
          if (result.data.text.trim()) texts.push(result.data.text);
        } finally {
          await worker.terminate(); // Release memory after each page
        }
      } catch (err) {
        console.warn(`OCR failed for page ${pageCount}:`, err);
      }
      
      // Force GC between pages
      if (global.gc) global.gc();
    }
    
    if (texts.length > 0) {
      console.log(`PDF extracted via OCR (${texts.length} pages)`);
      return texts.join('\n\n');
    }
  } catch (e) {
    console.error('OCR extraction failed:', e);
  }
  
  throw new Error('Could not extract text from PDF (tried both text-based and OCR methods)');
}

async function extractFromWord(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammothModule = require('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  
  console.log(`Word text extraction: ${text.length} chars, first 200 chars: "${text.substring(0, 200)}"`);
  
  return text;
}

async function extractFromImage(buffer: Buffer): Promise<string> {
  return ocrWithTesseract(buffer);
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
    // Sanitize filename: remove Vietnamese chars and special characters
    const sanitized = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore
    const fileName = `${documentId}/${Date.now()}_${sanitized}`;
    const { error: uploadError } = await supabase.storage
      .from('document-files')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

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
        extractedText = await extractFromImage(buffer);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the file');
    }

    // Chunk text
    const chunks = chunkText(extractedText);

    // Store chunks (text-based, no embeddings)
    const records = chunks.map((chunk, index) => ({
      document_id: documentId,
      chunk_text: chunk,
      chunk_index: index,
      metadata: { source_file_id: sourceFileId },
    }));

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
