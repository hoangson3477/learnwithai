import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Generate concepts from lesson content using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Get lesson content
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson không tồn tại' },
        { status: 404 }
      );
    }

    // Check if concepts already exist
    const { data: existingConcepts } = await supabase
      .from('concepts')
      .select('*')
      .eq('lesson_id', lessonId);

    if (existingConcepts && existingConcepts.length > 0) {
      return NextResponse.json({
        success: true,
        concepts: existingConcepts,
        message: `Đã có ${existingConcepts.length} concepts cho lesson này`,
      });
    }

    // Generate concepts using AI
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert educational content designer. Break down the following lesson content into digestible, bite-sized concepts that students can learn in 5-10 minutes each.

Lesson Title: ${lesson.title}
Lesson Content: ${lesson.content?.substring(0, 3000) || 'No content provided'}

Please analyze the content and generate 3-7 distinct concepts. For each concept, provide:
1. A clear, concise title (max 50 characters)
2. A brief description explaining the concept (1-2 sentences)
3. 2-4 key learning points (bullet points)
4. Estimated time to learn (in minutes, between 5-15)
5. Difficulty level (1-5, where 1 is beginner, 5 is advanced)

Return the response in this exact JSON format:
{
  "concepts": [
    {
      "title": "Concept Title",
      "description": "Brief explanation of the concept",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "estimatedTime": 10,
      "difficultyLevel": 2
    }
  ]
}

Make sure concepts build upon each other logically. The concepts should be self-contained but form a cohesive learning path when taken together.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON from response
    let concepts;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);
      concepts = parsed.concepts || parsed;
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      // Fallback: create simple concepts based on lesson structure
      concepts = [
        {
          title: 'Giới thiệu',
          description: `Tổng quan về ${lesson.title}`,
          keyPoints: ['Nắm vững kiến thức cơ bản', 'Hiểu bối cảnh và mục tiêu'],
          estimatedTime: 5,
          difficultyLevel: 1,
        },
        {
          title: 'Kiến thức chính',
          description: 'Nội dung cốt lõi của bài học',
          keyPoints: ['Phân tích nội dung chính', 'Nắm vững các khái niệm'],
          estimatedTime: 10,
          difficultyLevel: 2,
        },
        {
          title: 'Vận dụng',
          description: 'Áp dụng kiến thức vào thực tế',
          keyPoints: ['Ví dụ thực tế', 'Bài tập vận dụng'],
          estimatedTime: 10,
          difficultyLevel: 3,
        },
      ];
    }

    // Save concepts to database
    const conceptsToInsert = concepts.map((concept: any, index: number) => ({
      lesson_id: lessonId,
      title: concept.title,
      description: concept.description,
      order_index: index,
      estimated_time: concept.estimatedTime || 5,
      difficulty_level: concept.difficultyLevel || 2,
      key_points: concept.keyPoints || [],
      examples: concept.examples || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: createdConcepts, error: insertError } = await supabase
      .from('concepts')
      .insert(conceptsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      concepts: createdConcepts,
      count: createdConcepts?.length || 0,
      message: `Đã tạo ${createdConcepts?.length || 0} concepts từ lesson`,
    });
  } catch (error) {
    console.error('Generate concepts error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo concepts' },
      { status: 500 }
    );
  }
}
