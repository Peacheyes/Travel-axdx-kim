function getDayCount(input) {
  if (!input.startDate || !input.endDate) {
    return 2
  }

  const start = new Date(input.startDate)
  const end = new Date(input.endDate)

  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

  if (Number.isNaN(diffDays) || diffDays < 1) {
    return 2
  }

  return diffDays
}

function formatDateRange(input) {
  if (!input.startDate || !input.endDate) {
    return input.date || '맞춤 일정'
  }

  return `${input.startDate} ~ ${input.endDate}`
}

function createDaySchedules(places, style, dayCount) {
  return Array.from({ length: dayCount }, (_, index) => {
    const dayNumber = index + 1
    const firstPlace = places[index % places.length]
    const secondPlace = places[(index + 1) % places.length]
    const thirdPlace = places[(index + 2) % places.length]

    return {
      day: `Day ${dayNumber}`,
      schedules: [
        {
          time: '10:00',
          place: firstPlace,
          memo: `${style} 여행을 시작하는 오전 코스`,
        },
        {
          time: '14:00',
          place: secondPlace,
          memo: '이동 동선을 고려한 오후 일정',
        },
        {
          time: '18:30',
          place: thirdPlace,
          memo: '하루를 마무리하는 저녁 추천 장소',
        },
      ],
    }
  })
}

export function createRecommendations(input) {
  const destination = input.destination.trim()
  const dateRange = formatDateRange(input)
  const companion = input.companion || '여행자'
  const concept = input.concept
  const dayCount = getDayCount(input)

  const healingPlaces = ['감성 카페', '해변 산책로', '전망 좋은 야경 명소', '조용한 편집숍']
  const foodPlaces = ['로컬 맛집', '전통시장', '디저트 카페', '브런치 식당']
  const activityPlaces = ['체험 공간', '핫플 거리', '포토스팟', '전망대']

  return [
    {
      id: 'healing-route',
      theme: `${concept} 힐링 코스`,
      description: `${destination}에서 여유롭게 쉬고 감성적인 장소를 중심으로 즐기는 맞춤 일정입니다.`,
      reason: `${companion}과 함께 이동 부담을 줄이고, 휴식과 만족도를 높일 수 있도록 구성했습니다.`,
      estimatedTime: `${dateRange} / 총 ${dayCount}일`,
      places: healingPlaces,
      days: createDaySchedules(healingPlaces, '힐링', dayCount),
      influencerCourse: true,
    },
    {
      id: 'food-route',
      theme: `${destination} 미식 코스`,
      description: `${destination}의 로컬 맛집과 디저트 장소를 중심으로 구성한 테마 일정입니다.`,
      reason: '맛집 탐색 시간을 줄이고, 검증된 장소 위주로 빠르게 선택할 수 있도록 구성했습니다.',
      estimatedTime: `${dateRange} / 총 ${dayCount}일`,
      places: foodPlaces,
      days: createDaySchedules(foodPlaces, '미식', dayCount),
      influencerCourse: false,
    },
    {
      id: 'activity-route',
      theme: `${companion} 맞춤 액티비티 코스`,
      description: `${destination}에서 체험과 이동 동선을 함께 고려한 활동형 추천 일정입니다.`,
      reason: '동반자 유형을 고려해 이동 부담과 활동 강도를 적절히 조절했습니다.',
      estimatedTime: `${dateRange} / 총 ${dayCount}일`,
      places: activityPlaces,
      days: createDaySchedules(activityPlaces, '액티비티', dayCount),
      influencerCourse: true,
    },
  ]
}