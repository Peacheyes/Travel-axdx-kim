import { describe, expect, it } from 'vitest'
import { createRecommendations } from '../lib/recommendation'

describe('createRecommendations', () => {
  const input = {
    destination: '제주도',
    date: '2박 3일',
    companion: '연인',
    concept: '힐링',
  }

  it('3가지 추천 코스를 생성한다', () => {
    const recommendations = createRecommendations(input)

    expect(recommendations).toHaveLength(3)
  })

  it('각 추천 코스에는 테마, 설명, 추천 이유, 예상 소요시간, 주요 장소가 포함된다', () => {
    const recommendations = createRecommendations(input)

    recommendations.forEach((course) => {
      expect(course.theme).toBeTruthy()
      expect(course.description).toBeTruthy()
      expect(course.reason).toBeTruthy()
      expect(course.estimatedTime).toBeTruthy()
      expect(course.places.length).toBeGreaterThan(0)
    })
  })

  it('Day 1, Day 2 형식의 일정표를 포함한다', () => {
    const recommendations = createRecommendations(input)

    recommendations.forEach((course) => {
      it('2박 3일 입력 시 Day 1, Day 2, Day 3 형식의 일정표를 포함한다', () => {
  const recommendations = createRecommendations(input)

  recommendations.forEach((course) => {
    expect(course.days).toHaveLength(3)
    expect(course.days[0].day).toBe('Day 1')
    expect(course.days[1].day).toBe('Day 2')
    expect(course.days[2].day).toBe('Day 3')
  })
})
    })
  })

  it('추천 설명에 목적지가 반영된다', () => {
    const recommendations = createRecommendations(input)

    expect(recommendations[0].description).toContain('제주도')
  })

  it('인플루언서 코스가 하나 이상 포함된다', () => {
    const recommendations = createRecommendations(input)

    expect(recommendations.some((course) => course.influencerCourse)).toBe(true)
  })
})