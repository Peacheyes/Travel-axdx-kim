import { describe, expect, it } from 'vitest'
import { calculateRecommendationMatchRate } from '../lib/kpi'

describe('calculateRecommendationMatchRate', () => {
  it('전체 추천 수가 0이면 0을 반환한다', () => {
    expect(calculateRecommendationMatchRate(0, 0)).toBe(0)
  })

  it('추천 코스 저장률을 계산한다', () => {
    expect(calculateRecommendationMatchRate(2, 4)).toBe(0.5)
  })

  it('생성된 추천 코스를 모두 저장하면 1을 반환한다', () => {
    expect(calculateRecommendationMatchRate(3, 3)).toBe(1)
  })
})