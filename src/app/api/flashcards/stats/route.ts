import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const studySpaceId = searchParams.get('studySpaceId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Get flashcard stats
    let flashcardQuery = supabase
      .from('flashcards')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (studySpaceId) {
      flashcardQuery = flashcardQuery.eq('study_space_id', studySpaceId);
    }

    const { data: allFlashcards, count: totalFlashcards, error: flashcardError } = await flashcardQuery;

    if (flashcardError) {
      return NextResponse.json(
        { success: false, error: flashcardError.message },
        { status: 500 }
      );
    }

    // Get due cards count
    const now = new Date().toISOString();
    let dueQuery = supabase
      .from('flashcards')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .or(`next_review_date.lte.${now},next_review_date.is.null`);

    if (studySpaceId) {
      dueQuery = dueQuery.eq('study_space_id', studySpaceId);
    }

    const { count: dueCards, error: dueError } = await dueQuery;

    // Get concept mastery stats
    let masteryQuery = supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId);

    if (studySpaceId) {
      masteryQuery = masteryQuery.eq('study_space_id', studySpaceId);
    }

    const { data: conceptMastery, error: masteryError } = await masteryQuery;

    if (masteryError) {
      return NextResponse.json(
        { success: false, error: masteryError.message },
        { status: 500 }
      );
    }

    // Calculate overall stats
    const totalConcepts = conceptMastery?.length || 0;
    const masteredConcepts = conceptMastery?.filter(c => c.mastery_level >= 80).length || 0;
    const averageMastery = totalConcepts > 0
      ? Math.round(conceptMastery!.reduce((sum, c) => sum + c.mastery_level, 0) / totalConcepts)
      : 0;

    // Get today's reviews
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const todayReviews = allFlashcards?.filter(f => 
      f.last_reviewed_at && f.last_reviewed_at >= todayStr
    ).length || 0;

    // Get streak (consecutive days with reviews)
    let streak = 0;
    const reviewDates = [...new Set(allFlashcards
      ?.filter(f => f.last_reviewed_at)
      ?.map(f => f.last_reviewed_at.split('T')[0])
      ?.sort()
      ?.reverse() || [])];
    
    const todayDate = new Date().toISOString().split('T')[0];
    let checkDate = new Date();
    
    for (const dateStr of reviewDates) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      if (dateStr === checkDateStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === todayDate) {
        // Today has reviews but we're checking yesterday
        continue;
      } else {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalFlashcards: totalFlashcards || 0,
        dueCards: dueCards || 0,
        totalConcepts,
        masteredConcepts,
        averageMastery,
        todayReviews,
        streak,
        conceptMastery: conceptMastery || [],
      },
    });
  } catch (error) {
    console.error('Flashcards stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy thống kê flashcards' },
      { status: 500 }
    );
  }
}
