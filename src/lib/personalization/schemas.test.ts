import { learningEventSchema, profileUpsertSchema } from '@/lib/personalization/schemas';

describe('personalization schema validation', () => {
  it('validates profile payload', () => {
    const parsed = profileUpsertSchema.safeParse({
      subjectCode: 'programming',
      targetLevel: 'intermediate',
      weeklyMinutes: 180,
      preferredContentTypes: ['lesson', 'quiz'],
      goal: 'Ship production-grade apps',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid event payload', () => {
    const parsed = learningEventSchema.safeParse({
      eventType: 'unknown',
      contentType: 'quiz',
      subjectCode: 'programming',
    });

    expect(parsed.success).toBe(false);
  });
});
