import { computeConfidence, computeMasteryScore, computeRecommendationScore } from '@/lib/personalization/engine';

describe('personalization engine', () => {
  it('computes bounded mastery score', () => {
    expect(
      computeMasteryScore({
        currentMastery: 95,
        score: 100,
        attempts: 1,
      })
    ).toBeLessThanOrEqual(100);
  });

  it('increases confidence by attempts', () => {
    expect(computeConfidence(1)).toBeGreaterThan(0);
    expect(computeConfidence(8)).toBe(100);
  });

  it('prioritizes weak skills in recommendation score', () => {
    const weak = computeRecommendationScore({
      masteryScore: 20,
      confidence: 20,
      recencyDays: 7,
      preferredWeight: 1,
      prerequisiteMissing: false,
    });
    const strong = computeRecommendationScore({
      masteryScore: 90,
      confidence: 90,
      recencyDays: 1,
      preferredWeight: 1,
      prerequisiteMissing: false,
    });
    expect(weak).toBeGreaterThan(strong);
  });
});
