import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(
  quality: number,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
) {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    // Failed - reset repetitions
    repetitions = 0;
    interval = 1;
  } else {
    // Passed - increase repetitions and interval
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(currentInterval * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

// GET - Fetch flashcards for review or all flashcards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const studySpaceId = searchParams.get('studySpaceId');
    const dueForReview = searchParams.get('dueForReview') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('next_review_date', { ascending: true })
      .limit(limit);

    if (studySpaceId) {
      query = query.eq('study_space_id', studySpaceId);
    }

    if (dueForReview) {
      // Get cards due for review (next_review_date <= now or null)
      const now = new Date().toISOString();
      query = query.or(`next_review_date.lte.${now},next_review_date.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Flashcards fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, flashcards: data });
  } catch (error) {
    console.error('Flashcards GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy flashcards' },
      { status: 500 }
    );
  }
}

// POST - Create new flashcard or review flashcard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'review') {
      // Review flashcard with SM-2 algorithm
      const { flashcardId, quality, userId } = body;

      if (!flashcardId || quality === undefined || !userId) {
        return NextResponse.json(
          { success: false, error: 'Flashcard ID, quality, và user ID là bắt buộc' },
          { status: 400 }
        );
      }

      // Get current flashcard data
      const { data: flashcard, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !flashcard) {
        return NextResponse.json(
          { success: false, error: 'Flashcard không tồn tại' },
          { status: 404 }
        );
      }

      // Calculate next review using SM-2
      const reviewResult = calculateNextReview(
        quality,
        flashcard.ease_factor,
        flashcard.interval,
        flashcard.repetitions
      );

      // Update flashcard
      const { error: updateError } = await supabase
        .from('flashcards')
        .update({
          ease_factor: reviewResult.easeFactor,
          interval: reviewResult.interval,
          repetitions: reviewResult.repetitions,
          next_review_date: reviewResult.nextReviewDate,
          last_reviewed_at: new Date().toISOString(),
          total_reviews: flashcard.total_reviews + 1,
          correct_reviews: quality >= 3 
            ? flashcard.correct_reviews + 1 
            : flashcard.correct_reviews,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flashcardId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      // Update concept mastery
      await updateConceptMastery(userId, flashcard.concept, flashcard.study_space_id);

      return NextResponse.json({
        success: true,
        review: reviewResult,
        message: quality >= 3 ? 'Tuyệt vời! Bạn đã ghi nhớ được flashcard này.' : 'Không sao, bạn sẽ gặp lại flashcard này sớm.',
      });
    }

    // Create new flashcard
    const { userId, studySpaceId, lessonId, concept, front, back, tags } = body;

    if (!userId || !concept || !front || !back) {
      return NextResponse.json(
        { success: false, error: 'User ID, concept, front, và back là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: userId,
        study_space_id: studySpaceId,
        lesson_id: lessonId,
        concept,
        front,
        back,
        tags: tags || [],
        ease_factor: 2.5,
        interval: 0,
        repetitions: 0,
        next_review_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Flashcard insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Update concept mastery
    await updateConceptMastery(userId, concept, studySpaceId);

    return NextResponse.json({ success: true, flashcard: data });
  } catch (error) {
    console.error('Flashcards POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý flashcard' },
      { status: 500 }
    );
  }
}

// Helper function to update concept mastery
async function updateConceptMastery(userId: string, concept: string, studySpaceId?: string) {
  try {
    // Get all flashcards for this concept
    const { data: flashcards, error: countError } = await supabase
      .from('flashcards')
      .select('id, repetitions')
      .eq('user_id', userId)
      .eq('concept', concept);

    if (countError) {
      console.error('Count error:', countError);
      return;
    }

    const totalFlashcards = flashcards?.length || 0;
    const masteredFlashcards = flashcards?.filter(f => f.repetitions >= 3).length || 0;
    const masteryLevel = totalFlashcards > 0 
      ? Math.round((masteredFlashcards / totalFlashcards) * 100)
      : 0;

    // Upsert concept mastery
    const { error: upsertError } = await supabase
      .from('concept_mastery')
      .upsert({
        user_id: userId,
        study_space_id: studySpaceId,
        concept,
        mastery_level: masteryLevel,
        total_flashcards: totalFlashcards,
        mastered_flashcards: masteredFlashcards,
        last_studied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,concept'
      });

    if (upsertError) {
      console.error('Concept mastery upsert error:', upsertError);
    }
  } catch (error) {
    console.error('Update concept mastery error:', error);
  }
}

// PUT - Update flashcard
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { flashcardId, userId, updates } = body;

    if (!flashcardId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Flashcard ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('flashcards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, flashcard: data });
  } catch (error) {
    console.error('Flashcards PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật flashcard' },
      { status: 500 }
    );
  }
}

// DELETE - Delete flashcard
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flashcardId = searchParams.get('flashcardId');
    const userId = searchParams.get('userId');

    if (!flashcardId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Flashcard ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Flashcard đã được xóa' });
  } catch (error) {
    console.error('Flashcards DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xóa flashcard' },
      { status: 500 }
    );
  }
}
