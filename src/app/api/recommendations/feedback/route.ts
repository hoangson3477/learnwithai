import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { recommendationFeedbackSchema } from '@/lib/personalization/schemas';

export async function POST(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const parsed = recommendationFeedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const client = getAuthedClient(token);
  const payload = parsed.data;

  const { error: updateError } = await client
    .from('recommendations')
    .update({ status: payload.action })
    .eq('id', payload.recommendationId)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: insertError } = await client.from('recommendation_feedback').insert({
    recommendation_id: payload.recommendationId,
    user_id: user.id,
    action: payload.action,
    notes: payload.notes,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
