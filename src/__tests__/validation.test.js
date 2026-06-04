import { describe, expect, it } from 'vitest'
import { validateTravelInput } from '../lib/validation'

describe('validateTravelInput', () => {
  it('목적지, 일정, 여행 컨셉이 있으면 valid true를 반환한다', () => {
    const result = validateTravelInput({
      destination: '제주도',
      date: '2박 3일',
      companion: '연인',
      concept: '힐링',
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('목적지가 없으면 안내 메시지를 반환한다', () => {
    const result = validateTravelInput({
      destination: '',
      date: '2박 3일',
      companion: '연인',
      concept: '힐링',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('목적지를 선택해주세요')
  })

  it('여행 일정이 없으면 안내 메시지를 반환한다', () => {
    const result = validateTravelInput({
      destination: '부산',
      date: '',
      companion: '친구',
      concept: '미식',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('여행 일정을 선택해주세요')
  })

  it('여행 컨셉이 없으면 안내 메시지를 반환한다', () => {
    const result = validateTravelInput({
      destination: '강릉',
      date: '1박 2일',
      companion: '혼자',
      concept: '',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('여행 컨셉을 선택해주세요')
  })
})