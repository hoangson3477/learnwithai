import { z } from 'zod';

export const subjectCodeSchema = z.string().min(2).max(50);

export const profileUpsertSchema = z.object({
  subjectCode: subjectCodeSchema,
  targetLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  weeklyMinutes: z.number().int().min(30).max(1440).default(120),
  preferredContentTypes: z.array(z.enum(['lesson', 'quiz', 'document'])).min(1),
  goal: z.string().max(500).optional().default(''),
});

export const learningEventSchema = z.object({
  eventType: z.enum([
    'lesson_completed',
    'quiz_submitted',
    'chat_completed',
    'document_viewed',
    'recommendation_feedback',
  ]),
  contentType: z.enum(['lesson', 'quiz', 'document', 'chat_task']),
  contentId: z.string().uuid().optional(),
  subjectCode: subjectCodeSchema,
  topicCode: z.string().optional(),
  skillCode: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export const masteryPatchSchema = z.object({
  skillId: z.string().uuid(),
  masteryScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
});

export const recommendationRegenerateSchema = z.object({
  subjectCode: subjectCodeSchema.optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const recommendationFeedbackSchema = z.object({
  recommendationId: z.string().uuid(),
  action: z.enum(['accepted', 'skipped', 'completed']),
  notes: z.string().max(500).optional().default(''),
});
