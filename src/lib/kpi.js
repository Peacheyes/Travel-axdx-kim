export function calculateRecommendationMatchRate(savedCount, totalRecommendationCount) {
  if (totalRecommendationCount === 0) {
    return 0
  }

  return savedCount / totalRecommendationCount
}