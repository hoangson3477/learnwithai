import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { computeConfidence, computeMasteryScore } from '@/lib/personalization/engine';
import { learningEventSchema } from '@/lib/personalization/schemas';

export async function POST(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const parsed = learningEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const client = getAuthedClient(token);

  const { data: subject } = await client
    .from('subjects')
    .select('id')
    .eq('code', payload.subjectCode)
    .maybeSingle();

  const { data: skill } = payload.skillCode
    ? await client.from('skills').select('id').eq('code', payload.skillCode).maybeSingle()
    : { data: null };

  const { error: insertError } = await client.from('learning_events').insert({
    user_id: user.id,
    event_type: payload.eventType,
    content_type: payload.contentType,
    content_id: payload.contentId ?? null,
    subject_id: subject?.id ?? null,
    skill_id: skill?.id ?? null,
    score: payload.score ?? null,
    payload_json: payload.payload,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (skill?.id && typeof payload.score === 'number') {
    const { data: currentMastery } = await client
      .from('user_skill_mastery')
      .select('mastery_score, attempts')
      .eq('user_id', user.id)
      .eq('skill_id', skill.id)
      .maybeSingle();

    const attempts = (currentMastery?.attempts ?? 0) + 1;
    const nextMastery = computeMasteryScore({
      currentMastery: Number(currentMastery?.mastery_score ?? 0),
      score: payload.score,
      attempts,
    });

    await client.from('user_skill_mastery').upsert(
      {
        user_id: user.id,
        skill_id: skill.id,
        mastery_score: nextMastery,
        confidence: computeConfidence(attempts),
        attempts,
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,skill_id' }
    );
  }

  return NextResponse.json({ success: true });
}
