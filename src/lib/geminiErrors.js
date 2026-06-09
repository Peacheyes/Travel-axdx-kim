export function getGeminiUserMessage(error) {
  const message = String(error?.message || error || '');
  const status = error?.status || error?.code || error?.error?.code;

  if (
    status === 429
    || message.includes('429')
    || message.includes('RESOURCE_EXHAUSTED')
    || message.includes('quota')
  ) {
    return 'Gemini AI 일일 사용 한도에 도달했습니다. 내일 다시 시도해 주세요.';
  }

  if (message.includes('API key') || message.includes('API_KEY')) {
    return 'Gemini API 키를 확인해 주세요. (.env의 VITE_GEMINI_API_KEY)';
  }

  if (message === 'INVALID_RESPONSE') {
    return 'AI 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (message === 'MISSING_API_KEY') {
    return 'Gemini API 키가 설정되지 않았습니다. (.env 파일을 확인해 주세요)';
  }

  return '코스 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}
