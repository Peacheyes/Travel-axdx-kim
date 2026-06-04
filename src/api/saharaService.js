// src/api/saharaService.js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const getSaharaRecommendation = async (destination, schedule, companion, concept) => {
  try {
    const prompt = `
      너는 최고의 맞춤형 여행 데이터 분석가이자 플래너 'Sahara'야. 
      사용자의 요청에 맞춰서 '실제로 바로 방문할 수 있는 구체적인 장소'들로 구성된 여행 코스 3가지 테마를 제안해줘.
      단순한 추천을 넘어, 장소 간의 물리적 이동 동선(라우팅)과 예상 경비를 최적화하여 반환해야 해.

      [사용자 정보]
      - 목적지: ${destination}
      - 일정: ${schedule}
      - 동반자: ${companion}
      - 여행 컨셉: ${concept}

      [★매우 중요한 제약조건★]
      1. "근처 카페", "유명한 식당" 같은 추상적인 표현은 절대 금지한다.
      2. 카카오맵에서 검색 가능한 **실제 존재하는 구체적인 상호명**을 적어라.
      3. 동선을 최우선으로 고려하라. A에서 B로 이동할 때 물리적으로 비효율적인 경로는 배제하라.
      4. 응답은 반드시 아래의 JSON 구조를 100% 준수하는 배열(Array) 형태로만 출력하라. 마크다운(\`\`\`json)이나 부가 설명은 절대 넣지 마라.

      [출력할 JSON 포맷]
      [
        {
          "themeName": "테마 이름 (예: 동선 최적화 힐링 코스)",
          "themeDescription": "이 테마의 핵심 컨셉 1줄 요약",
          "totalBudget": 150000, // 테마 전체 예상 경비 (숫자만)
          "itinerary": [
            {
              "day": 1,
              "places": [
                {
                  "placeName": "실제 상호명",
                  "category": "관광/식당/카페/숙소/액티비티",
                  "reason": "추천 이유",
                  "stayTime": "예상 체류 시간 (예: 2시간)",
                  "transitInfo": "다음 장소까지 이동 정보 (예: 도보 15분 / 마지막 장소일 경우 '일정 종료')",
                  "estimatedCost": 25000 // 이 장소에서의 예상 경비 (숫자만)
                }
              ]
            }
          ]
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const responseText = response.text;
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJsonString);

  } catch (error) {
    console.error("Sahara API Data Pipeline Error:", error);
    throw error; 
  }
};