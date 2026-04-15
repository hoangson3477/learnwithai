import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';
import { profileUpsertSchema } from '@/lib/personalization/schemas';

export async function GET(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const client = getAuthedClient(token);
  const { data, error: dbError } = await client
    .from('user_learning_profiles')
    .select('*, subject:subjects(code, name)')
    .eq('user_id', user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profiles: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const { user, error, token } = await checkAuth(request);
  if (!user || !token) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const parsed = profileUpsertSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const client = getAuthedClient(token);
  const { data: subject, error: subjectError } = await client
    .from('subjects')
    .select('id')
    .eq('code', parsed.data.subjectCode)
    .single();

  if (subjectError || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const { error: upsertError } = await client.from('user_learning_profiles').upsert(
    {
      user_id: user.id,
      subject_id: subject.id,
      target_level: parsed.data.targetLevel,
      weekly_minutes: parsed.data.weeklyMinutes,
      preferred_content_types: parsed.data.preferredContentTypes,
      goal: parsed.data.goal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,subject_id' }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
