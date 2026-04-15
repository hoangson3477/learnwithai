type MasteryInput = {
  currentMastery: number;
  score: number;
  attempts: number;
};

type RecommendationInput = {
  masteryScore: number;
  confidence: number;
  recencyDays: number;
  preferredWeight: number;
  prerequisiteMissing: boolean;
};

export function computeMasteryScore(input: MasteryInput) {
  const scoreDelta = input.score >= 80 ? 12 : input.score >= 60 ? 6 : -4;
  const attemptsPenalty = Math.min(input.attempts * 0.5, 5);
  const raw = input.currentMastery + scoreDelta - attemptsPenalty;
  return Math.max(0, Math.min(100, Number(raw.toFixed(2))));
}

export function computeConfidence(attempts: number) {
  return Math.min(100, Math.round(attempts * 12.5));
}

export function computeRecommendationScore(input: RecommendationInput) {
  const weaknessBoost = 100 - input.masteryScore;
  const confidenceBoost = 100 - input.confidence;
  const recencyBoost = Math.min(input.recencyDays * 2, 25);
  const prerequisitePenalty = input.prerequisiteMissing ? 30 : 0;
  const raw =
    weaknessBoost * 0.5 +
    confidenceBoost * 0.2 +
    recencyBoost * 0.2 +
    input.preferredWeight * 20 -
    prerequisitePenalty;
  return Math.max(0, Math.min(100, Number(raw.toFixed(2))));
}
