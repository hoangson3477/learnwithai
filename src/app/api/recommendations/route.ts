import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { computeRecommendationScore } from '@/lib/personalization/engine';
import { recommendationRegenerateSchema } from '@/lib/personalization/schemas';

function daysSince(dateString?: string) {
  if (!dateString) return 14;
  const last = new Date(dateString).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - last) / (1000 * 60 * 60 * 24)));
}

export async function GET(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const client = getAuthedClient(token);
  const subjectCode = request.nextUrl.searchParams.get('subjectCode');

  let query = client
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('score', { ascending: false })
    .limit(10);

  if (subjectCode) {
    const { data: subject } = await client.from('subjects').select('id').eq('code', subjectCode).maybeSingle();
    if (subject?.id) query = query.eq('subject_id', subject.id);
  }

  const { data, error: dbError } = await query;
  if (dbError) {
    // If personalization tables are not migrated yet, do not break dashboard.
    if (dbError.code === '42P01') {
      return NextResponse.json({ success: true, recommendations: [] });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const rows = data ?? [];
  const subjectIds = [...new Set(rows.map((row) => row.subject_id).filter(Boolean))];

  let subjectMap = new Map<string, { code: string; name: string }>();
  if (subjectIds.length > 0) {
    const { data: subjects } = await client.from('subjects').select('id, code, name').in('id', subjectIds);
    subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, { code: subject.code, name: subject.name }]));
  }

  const enriched = rows.map((row) => ({
    ...row,
    subject: row.subject_id ? subjectMap.get(row.subject_id) ?? null : null,
  }));

  return NextResponse.json({ success: true, recommendations: enriched });
}

export async function POST(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const parsed = recommendationRegenerateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const client = getAuthedClient(token);
  const { data: profiles } = await client
    .from('user_learning_profiles')
    .select('preferred_content_types, subject_id')
    .eq('user_id', user.id);

  const { data: masteryRows } = await client
    .from('user_skill_mastery')
    .select('skill_id, mastery_score, confidence, last_practiced_at')
    .eq('user_id', user.id)
    .order('mastery_score', { ascending: true })
    .limit(parsed.data.limit);

  if (!masteryRows?.length) {
    return NextResponse.json({ success: true, created: 0 });
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.subject_id, p.preferred_content_types ?? []]));
  const toInsert: Record<string, unknown>[] = [];

  for (const row of masteryRows) {
    const { data: skill } = await client
      .from('skills')
      .select('id, topic_id, topic:topics(subject_id)')
      .eq('id', row.skill_id)
      .single();
    if (!skill) continue;

    const subjectId = (skill.topic as { subject_id?: string } | null)?.subject_id ?? null;
    const preferred = subjectId ? profileMap.get(subjectId) ?? ['lesson'] : ['lesson'];
    const preferredType = preferred[0] ?? 'lesson';
    const recScore = computeRecommendationScore({
      masteryScore: Number(row.mastery_score ?? 0),
      confidence: Number(row.confidence ?? 0),
      recencyDays: daysSince(row.last_practiced_at ?? undefined),
      preferredWeight: 1,
      prerequisiteMissing: false,
    });

    toInsert.push({
      user_id: user.id,
      subject_id: subjectId,
      topic_id: skill.topic_id,
      skill_id: row.skill_id,
      content_type: preferredType,
      content_id: row.skill_id,
      score: recScore,
      reason_json: {
        mastery: row.mastery_score,
        confidence: row.confidence,
      },
      status: 'pending',
    });
  }

  if (toInsert.length) {
    const { error: insertError } = await client.from('recommendations').insert(toInsert);
    if (insertError && insertError.code !== '42P01') {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, created: toInsert.length });
}
