import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { masteryPatchSchema } from '@/lib/personalization/schemas';

export async function GET(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const subjectCode = request.nextUrl.searchParams.get('subjectCode');
  const client = getAuthedClient(token);

  let query = client
    .from('user_skill_mastery')
    .select('*, skill:skills(id, code, name, topic:topics(code, name, subject:subjects(code, name)))')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (subjectCode) {
    const { data: subject } = await client.from('subjects').select('id').eq('code', subjectCode).maybeSingle();
    if (subject?.id) {
      const { data: topicRows } = await client.from('topics').select('id').eq('subject_id', subject.id);
      const topicIds = (topicRows ?? []).map((t) => t.id);
      if (topicIds.length) {
        const { data: skillRows } = await client.from('skills').select('id').in('topic_id', topicIds);
        const skillIds = (skillRows ?? []).map((s) => s.id);
        query = query.in('skill_id', skillIds.length ? skillIds : ['00000000-0000-0000-0000-000000000000']);
      }
    }
  }

  const { data, error: dbError } = await query;
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, mastery: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const parsed = masteryPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const client = getAuthedClient(token);
  const { error: dbError } = await client.from('user_skill_mastery').upsert(
    {
      user_id: user.id,
      skill_id: parsed.data.skillId,
      mastery_score: parsed.data.masteryScore,
      confidence: parsed.data.confidence,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,skill_id' }
  );

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
