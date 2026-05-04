import { NextResponse } from 'next/server';
import genAI from '@/lib/gemini';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user, token } = await checkAuth(request);
    if (!user || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, topic } = await request.json();

    if (!message || !topic) {
      return NextResponse.json(
        { error: 'Message and topic are required' },
        { status: 400 }
      );
    }

    // Call Google Gemini API
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      systemInstruction: `You are a friendly English tutor here to help students learn. Respond in Vietnamese. Keep responses short, encouraging, and use emojis! Focus on educational content for the topic: ${topic}`
    });

    const result = await model.generateContent(message);
    const assistantMessage = result.response.text();

    // Save to database if userId provided
    try {
      const client = getAuthedClient(token);
      await client.from('chat_history').insert([
        {
          user_id: user.id,
          topic: topic,
          title: message.slice(0, 50) + '...',
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: assistantMessage },
          ],
        },
      ]);
    } catch (dbError) {
      console.error('Database save error:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    
    // Handle quota exceeded error
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: number }).status === 429
    ) {
      return NextResponse.json(
        { error: 'AI tutor đã đạt giới hạn sử dụng. Vui lòng thử lại sau một vài phút.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Không thể xử lý tin nhắn chat. Vui lòng thử lại sau một vài giây.' },
      { status: 500 }
    );
  }
}
