import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function fallbackRecommendations(input) {
  const destination = input.destination || '여행지'
  const date = input.date || '2박 3일'
  const companion = input.companion || '여행자'
  const concept = input.concept || '힐링'

  return [
    {
      id: 'ai-healing-route',
      theme: `${concept} 감성 코스`,
      description: `${destination}에서 여유롭게 즐길 수 있는 ${date} 맞춤 일정입니다.`,
      reason: `${companion}과 함께 이동 부담을 줄이고 만족도를 높이도록 구성했습니다.`,
      estimatedTime: `${date} / 하루 약 6시간`,
      places: ['감성 카페', '산책 명소', '야경 포인트'],
      days: [
        {
          day: 'Day 1',
          schedules: [
            { time: '10:00', place: '감성 카페', memo: '브런치와 여행 시작' },
            { time: '14:00', place: '산책 명소', memo: '사진 촬영과 휴식' },
            { time: '18:30', place: '야경 포인트', memo: '저녁 후 야경 감상' },
          ],
        },
        {
          day: 'Day 2',
          schedules: [
            { time: '11:00', place: '로컬 거리', memo: '가벼운 산책' },
            { time: '15:00', place: '조용한 카페', memo: '휴식 중심 일정' },
            { time: '19:00', place: '인기 맛집', memo: '저녁 식사' },
          ],
        },
      ],
      influencerCourse: true,
    },
    {
      id: 'ai-food-route',
      theme: `${destination} 미식 코스`,
      description: `${destination}의 로컬 맛집과 디저트 장소를 중심으로 구성한 일정입니다.`,
      reason: '맛집 탐색 시간을 줄이고 검증된 장소 위주로 빠르게 선택할 수 있습니다.',
      estimatedTime: `${date} / 하루 약 7시간`,
      places: ['로컬 맛집', '전통시장', '디저트 카페'],
      days: [
        {
          day: 'Day 1',
          schedules: [
            { time: '11:30', place: '로컬 맛집', memo: '대표 메뉴 점심' },
            { time: '15:00', place: '전통시장', memo: '간식과 구경' },
            { time: '18:30', place: '디저트 카페', memo: '저녁 후 휴식' },
          ],
        },
        {
          day: 'Day 2',
          schedules: [
            { time: '10:30', place: '브런치 식당', memo: '가벼운 시작' },
            { time: '13:30', place: '핫플 카페', memo: 'SNS 인기 장소 방문' },
            { time: '17:00', place: '로컬 식당', memo: '마무리 식사' },
          ],
        },
      ],
      influencerCourse: false,
    },
    {
      id: 'ai-activity-route',
      theme: `${companion} 맞춤 액티비티 코스`,
      description: `${destination}에서 체험과 이동 동선을 함께 고려한 활동형 일정입니다.`,
      reason: '동반자 유형을 고려해 이동 부담과 활동 강도를 적절히 조절했습니다.',
      estimatedTime: `${date} / 하루 약 8시간`,
      places: ['체험 공간', '핫플 거리', '포토스팟'],
      days: [
        {
          day: 'Day 1',
          schedules: [
            { time: '10:00', place: '체험 공간', memo: '예약형 체험 활동' },
            { time: '14:30', place: '핫플 거리', memo: '쇼핑과 구경' },
            { time: '17:30', place: '포토스팟', memo: '사진 촬영' },
          ],
        },
        {
          day: 'Day 2',
          schedules: [
            { time: '11:00', place: '전망대', memo: '가벼운 산책' },
            { time: '15:00', place: '로컬 거리', memo: '자유 일정' },
            { time: '18:00', place: '인기 식당', memo: '저녁 식사' },
          ],
        },
      ],
      influencerCourse: true,
    },
  ]
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'POST 요청만 가능합니다.' })
  }

  try {
    const { destination, date, companion, concept } = request.body

    if (!destination || !date || !concept) {
      return response.status(400).json({
        error: '목적지, 여행 일정, 여행 컨셉을 모두 입력해주세요.',
      })
    }

    const prompt = `
너는 AX 기반 초개인화 여행 큐레이션 플랫폼의 여행 일정 추천 엔진이다.

사용자 조건:
- 목적지: ${destination}
- 여행 일정: ${date}
- 동반자: ${companion || '선택 안 함'}
- 여행 컨셉: ${concept}

서로 다른 3가지 테마의 여행 코스를 한국어로 생성해라.

반드시 아래 JSON 형식만 반환해라.
마크다운, 설명 문장, 코드블록은 절대 넣지 마라.

{
  "recommendations": [
    {
      "id": "english-lowercase-id",
      "theme": "코스 테마",
      "description": "코스 설명",
      "reason": "추천 이유",
      "estimatedTime": "예상 소요시간",
      "places": ["장소1", "장소2", "장소3"],
      "days": [
        {
          "day": "Day 1",
          "schedules": [
            { "time": "10:00", "place": "장소명", "memo": "일정 설명" }
          ]
        }
      ],
      "influencerCourse": true
    }
  ]
}

조건:
- recommendations는 반드시 3개
- ${date}에 맞게 Day 개수를 구성
- 1박 2일이면 Day 1, Day 2
- 2박 3일이면 Day 1, Day 2, Day 3
- 3박 4일이면 Day 1, Day 2, Day 3, Day 4
- 각 코스는 theme, description, reason, estimatedTime, places, days를 반드시 포함
- 각 places는 3개 이상
- 각 Day에는 최소 2개 이상의 schedule 포함
- 실제 존재 여부가 불확실한 가게 이름보다 일반적인 장소 유형 중심으로 작성
`

    const aiResponse = await client.responses.create({
      model: 'gpt-5.5',
      input: prompt,
    })

    const text = aiResponse.output_text
    const parsed = JSON.parse(text)

    if (!Array.isArray(parsed.recommendations)) {
      return response.status(200).json({
        recommendations: fallbackRecommendations({ destination, date, companion, concept }),
      })
    }

    return response.status(200).json(parsed)
  } catch (error) {
    console.error(error)

    return response.status(200).json({
      recommendations: fallbackRecommendations(request.body || {}),
      warning: 'AI 응답 대신 fallback 추천을 반환했습니다.',
    })
  }
}