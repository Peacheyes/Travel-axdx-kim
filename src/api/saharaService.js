// src/api/saharaService.js
import { GoogleGenAI } from '@google/genai';

// 1. .env에 저장한 키를 불러와서 AI 객체 세팅
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// 2. 외부에서 사용할 수 있게 함수를 내보냄(export)
export const getSaharaRecommendation = async (destination, schedule, companion, concept) => {
  try {
    // 3. AI에게 내릴 강력한 지시문 (프롬프트 엔지니어링)
    const prompt = `
      너는 최고의 맞춤형 여행 플래너 'Sahara'야. 
      사용자의 요청에 맞춰서 '실제로 바로 방문할 수 있는 구체적인 장소'들로만 구성된 여행 코스 3가지 테마를 제안해줘.

      [사용자 정보]
      - 목적지: ${destination}
      - 일정: ${schedule}
      - 동반자: ${companion}
      - 여행 컨셉: ${concept}

      [★매우 중요한 제약조건★]
      1. "근처 카페", "유명한 식당" 같은 추상적인 표현은 절대 금지한다.
      2. 반드시 카카오맵에서 검색했을 때 나오는 실제 존재하는 구체적인 상호명(예: '해동용궁사', '스타벅스 해운대점')을 적어라.
      3. 동선을 고려하여 현실적으로 이동 가능한 코스를 짜라.
      4. 응답은 반드시 아래의 JSON 배열 형식으로만 출력하고, 마크다운 기호(\`\`\`json 등)나 다른 인사말은 절대 포함하지 마라.

      [
        {
          "themeName": "테마 이름 (예: 바다향 가득 힐링 코스)",
          "themeDescription": "이 테마의 핵심 컨셉 1줄 요약",
          "itinerary": [
            {
              "day": 1,
              "places": [
                {
                  "placeName": "실제 장소/상호명 (예: 광안리 해수욕장)",
                  "category": "관광/식당/카페/숙소 중 택 1",
                  "reason": "여기를 추천하는 이유 (1~2문장 짧게)",
                  "timeHint": "예상 소요 시간 (예: 2시간)"
                }
              ]
            }
          ]
        }
      ]
    `;

    // 4. 최신 제미나이 모델 호출
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const responseText = response.text;
    
    // 5. AI가 혹시라도 코드 블록 마크다운(```json)을 섞어 보낼 경우를 대비한 전처리(Parsing) 로직
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 문자를 완벽한 자바스크립트 객체(배열)로 변환해서 반환!
    return JSON.parse(cleanJsonString);

  } catch (error) {
    console.error("Sahara API 호출 중 에러 발생:", error);
    throw error; // 에러가 나면 화면단에서 처리할 수 있게 던져줌
  }
};