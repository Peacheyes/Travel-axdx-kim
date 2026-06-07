// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해 주세요.')
}

// React 앱 전체에서 사용할 Supabase 인스턴스 내보내기
export const supabase = createClient(supabaseUrl, supabaseAnonKey)