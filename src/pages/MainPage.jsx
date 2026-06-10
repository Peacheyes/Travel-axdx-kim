// src/pages/MainPage.jsx
import { useMemo, useState, useEffect } from 'react'
import TravelForm from '../components/TravelForm'
import { createRecommendations } from '../lib/recommendation'
import { calculateRecommendationMatchRate } from '../lib/kpi'
import { getSaharaRecommendation } from '../api/saharaService'
import CourseMap from '../components/CourseMap'
import { supabase } from '../lib/supabaseClient'
import '../App.css'

const previewInput = {
  destination: '제주도',
  startDate: '2026-06-12',
  endDate: '2026-06-14',
  companion: '친구',
  concept: '힐링',
}

// 🌟 첫 화면 인플루언서 추천 코스 기본 데이터
const INFLUENCER_COURSES = [
  {
    id: 'influencer-seoul-1',
    influencerCourse: true,
    estimatedTime: '예상 총 경비: 55,000원',
    theme: '성수동 힙스터 핫플 투어',
    description: '트렌디한 카페와 복합문화공간을 완벽하게 즐기는 감성 충만 하루 코스',
    headerImg: 'https://picsum.photos/seed/seongsu/800/400',
    days: [
      {
        day: 'Day 1',
        schedules: [
          { place: '대림창고', category: '카페', transit: '도보 8분', cost: 15000, tourApiImg: 'https://picsum.photos/seed/daerim/120/120' },
          { place: '성수연방', category: '관광', transit: '도보 10분', cost: 0, tourApiImg: 'https://picsum.photos/seed/yeonbang/120/120' },
          { place: '성수다락', category: '식당', transit: '일정 종료', cost: 40000, tourApiImg: 'https://picsum.photos/seed/darak/120/120' }
        ]
      }
    ]
  },
  {
    id: 'influencer-seoul-2',
    influencerCourse: true,
    estimatedTime: '예상 총 경비: 42,000원',
    theme: '북촌 한옥마을 감성 산책',
    description: '고즈넉한 한옥의 정취와 현대적인 감각이 어우러진 조용한 힐링 코스',
    headerImg: 'https://picsum.photos/seed/bukchon/800/400',
    days: [
      {
        day: 'Day 1',
        schedules: [
          { place: '어니언 안국', category: '카페', transit: '도보 15분', cost: 12000, tourApiImg: 'https://picsum.photos/seed/onion/120/120' },
          { place: '북촌한옥마을', category: '관광', transit: '도보 10분', cost: 0, tourApiImg: 'https://picsum.photos/seed/hanok/120/120' },
          { place: '깡통만두', category: '식당', transit: '일정 종료', cost: 30000, tourApiImg: 'https://picsum.photos/seed/mandoo/120/120' }
        ]
      }
    ]
  },
  {
    id: 'influencer-seoul-3',
    influencerCourse: true,
    estimatedTime: '예상 총 경비: 85,000원',
    theme: '여의도 한강 야경 & 쇼핑 투어',
    description: '서울의 중심에서 즐기는 완벽한 휴식과 쇼핑, 그리고 낭만적인 야경',
    headerImg: 'https://picsum.photos/seed/yeouido/800/400',
    days: [
      {
        day: 'Day 1',
        schedules: [
          { place: '더현대 서울', category: '쇼핑', transit: '도보 10분', cost: 50000, tourApiImg: 'https://picsum.photos/seed/thehyundai/120/120' },
          { place: '여의도 한강공원', category: '관광', transit: '도보 15분', cost: 15000, tourApiImg: 'https://picsum.photos/seed/hangang/120/120' },
          { place: '세상의모든아침', category: '식당', transit: '일정 종료', cost: 20000, tourApiImg: 'https://picsum.photos/seed/semoa/120/120' }
        ]
      }
    ]
  }
];

const DAY_THEMES = [
  { main: '#3182ce', bg: '#ebf8ff' }, 
  { main: '#38a169', bg: '#f0fff4' }, 
  { main: '#dd6b20', bg: '#fffaf0' }, 
  { main: '#805ad5', bg: '#faf5ff' }, 
  { main: '#e53e3e', bg: '#fff5f5' }, 
];

const FREE_MAX_GENERATE = 2;
const FREE_MAX_SAVE = 3;

const fetchTourApiImage = async (keyword) => {
  const serviceKey = import.meta.env.VITE_TOUR_API_KEY;
  if (!serviceKey) return null; 

  try {
    const baseUrl = 'https://apis.data.go.kr/B551011/KorService4/searchKeyword4';
    const params = new URLSearchParams({
      serviceKey: serviceKey, 
      MobileOS: 'ETC', MobileApp: 'Sahara', _type: 'json',
      keyword: keyword, numOfRows: '1', pageNo: '1',
    });
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    const item = data?.response?.body?.items?.item?.[0];
    return item?.firstimage || item?.firstimage2 || null;
  } catch (error) {
    return null;
  }
};

function MainPage() {
  const [recommendations, setRecommendations] = useState(INFLUENCER_COURSES)
  const [mySavedCourses, setMySavedCourses] = useState([])
  const [user, setUser] = useState(null)
  const [generationCount, setGenerationCount] = useState(0)

  // 🌟 [추가] 시스템 알림창(Modal) 공통 상태
  const [sysModal, setSysModal] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'prompt'
    title: '',
    message: '',
    onConfirm: null,
  })
  const [promptInput, setPromptInput] = useState('')

  useEffect(() => {
    if (user) {
      const savedData = localStorage.getItem(`sahara_saved_${user.email}`)
      setMySavedCourses(savedData ? JSON.parse(savedData) : [])
      const genCount = localStorage.getItem(`sahara_genCount_${user.email}`)
      setGenerationCount(genCount ? Number(genCount) : 0)
    } else {
      setMySavedCourses([])
      setGenerationCount(0)
    }
  }, [user])

  const [currentConcept, setCurrentConcept] = useState('핫플투어')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  
  const [isMyPageOpen, setIsMyPageOpen] = useState(false)
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  
  const [selectedDetailCourse, setSelectedDetailCourse] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const visibleRecommendations = recommendations

  const matchRate = useMemo(() => {
    return calculateRecommendationMatchRate(mySavedCourses.length, visibleRecommendations.length)
  }, [mySavedCourses.length, visibleRecommendations.length])

  const matchRatePercent = Math.round(matchRate * 100)

  // 🌟 [추가] 공통 커스텀 모달 호출 헬퍼 함수
  const showAlert = (title, message, onConfirm = null) => {
    setSysModal({ isOpen: true, type: 'alert', title, message, onConfirm });
  };

  const showPrompt = (title, message, onConfirm) => {
    setPromptInput('');
    setSysModal({ isOpen: true, type: 'prompt', title, message, onConfirm });
  };

  const restoreInfluencerCourses = () => {
    setRecommendations(INFLUENCER_COURSES);
  };

  const moveSchedule = (courseId, dayIndex, scheduleIndex, direction) => {
    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      const newSchedules = [...day.schedules];
      if (direction === 'up' && scheduleIndex > 0) [newSchedules[scheduleIndex - 1], newSchedules[scheduleIndex]] = [newSchedules[scheduleIndex], newSchedules[scheduleIndex - 1]];
      else if (direction === 'down' && scheduleIndex < newSchedules.length - 1) [newSchedules[scheduleIndex], newSchedules[scheduleIndex + 1]] = [newSchedules[scheduleIndex + 1], newSchedules[scheduleIndex]];
      day.schedules = newSchedules; newDays[dayIndex] = day; return { ...course, days: newDays };
    }));
  };

  const deleteSchedule = (courseId, dayIndex, scheduleIndex) => {
    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      day.schedules = day.schedules.filter((_, idx) => idx !== scheduleIndex);
      newDays[dayIndex] = day; return { ...course, days: newDays };
    }));
  };

  // 🌟 [수정] window.prompt 대신 커스텀 프롬프트 모달 사용
  const addSchedule = (courseId, dayIndex) => {
    showPrompt('장소 추가', '추가할 장소 이름을 입력하세요:', async (newPlaceName) => {
      if (!newPlaceName || newPlaceName.trim() === '') return;

      const fetchedImg = await fetchTourApiImage(newPlaceName.trim());

      setRecommendations(prev => prev.map(course => {
        if (course.id !== courseId) return course;
        const newDays = [...course.days];
        const day = { ...newDays[dayIndex] };
        day.schedules = [...day.schedules, { place: newPlaceName, category: '⭐ 직접 추가', transit: '', cost: 0, tourApiImg: fetchedImg }];
        newDays[dayIndex] = day; return { ...course, days: newDays };
      }));
    });
  };

  // 🤖 AI 코스 생성 바인딩
  const handleGenerate = async (input) => {
    if (!user) {
      // 🌟 [수정] 기본 alert 대신 커스텀 showAlert 사용
      showAlert('로그인 필요', 'AI 맞춤 코스를 생성하려면 먼저 로그인이 필요합니다. 🔒', () => setIsLoginOpen(true));
      return;
    }

    if (!user.isPremium && generationCount >= FREE_MAX_GENERATE) {
      setIsPremiumModalOpen(true);
      return;
    }

    setIsLoading(true)
    setErrorMessage('')
    setCurrentConcept(input.concept || '일반')

    try {
      const scheduleText = `${input.startDate} 부터 ${input.endDate} 까지`
      const aiData = await getSaharaRecommendation(input.destination, scheduleText, input.companion, input.concept)
      
      const formattedResults = await Promise.all(aiData.map(async (item, index) => {
        const safeBudget = Number(item.totalBudget) || 0; 

        const daysWithImages = await Promise.all((item.itinerary || []).map(async (dayPlan) => {
          const placesWithImages = await Promise.all((dayPlan.places || []).map(async (place) => {
            const safeCost = Number(place.estimatedCost) || 0;
            const currentPlaceName = place.placeName || '장소명 없음';
            const apiImageUrl = await fetchTourApiImage(currentPlaceName);

            return { 
              place: currentPlaceName, category: place.category || '관광', transit: place.transitInfo || '', cost: safeCost, tourApiImg: apiImageUrl 
            };
          }));

          return { day: `Day ${dayPlan.day}`, schedules: placesWithImages };
        }));

        return {
          id: `ai-course-${Date.now()}-${index}`,
          influencerCourse: false,
          estimatedTime: `예상 총 경비: ${safeBudget.toLocaleString()}원`,
          theme: item.themeName || '맞춤 테마',
          description: item.themeDescription || '',
          days: daysWithImages
        };
      }));

      if (!user.isPremium) {
        formattedResults.forEach(course => {
          if (course.days.length > 0) {
            course.days[0].schedules.splice(1, 0, {
              place: `특가할인! ${input.destination} 오션뷰 호텔`,
              category: '스폰서',
              transit: '추천 동선',
              cost: 0,
              tourApiImg: `https://picsum.photos/seed/ad${Date.now()}/120/120`,
              isAd: true 
            });
          }
        });
      }

      setRecommendations(formattedResults)
      
      const newCount = generationCount + 1;
      setGenerationCount(newCount);
      localStorage.setItem(`sahara_genCount_${user.email}`, newCount);

    } catch (error) {
      console.error("AI 생성 에러:", error)
      setErrorMessage('코스 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCourse = async (courseId) => {
    if (!user) { 
      showAlert('로그인 필요', '코스를 내 일정에 저장하려면 로그인이 필요합니다. 🔒', () => setIsLoginOpen(true));
      return; 
    }
    
    if (!user.isPremium && mySavedCourses.length >= FREE_MAX_SAVE) {
      setIsPremiumModalOpen(true);
      return;
    }
    
    if (mySavedCourses.some(c => c.id === courseId)) return;

    const selectedCourse = visibleRecommendations.find(c => c.id === courseId)
    if (!selectedCourse) return

    const numericBudget = Number(selectedCourse.estimatedTime.replace(/[^0-9]/g, '')) || 0

    try {
      await supabase.from('saved_courses').insert([{ id: courseId, user_email: user.email, theme: selectedCourse.theme, concept: currentConcept, total_budget: numericBudget }])
    } catch (error) {
      console.log('로컬에만 저장됩니다.')
    }

    const updatedCourses = [...mySavedCourses, selectedCourse];
    setMySavedCourses(updatedCourses);
    localStorage.setItem(`sahara_saved_${user.email}`, JSON.stringify(updatedCourses));
    
    // 🌟 [수정] 기본 alert 대체
    showAlert('저장 완료', '보관함에 안전하게 저장되었습니다! 🎒');
  }

  const handleDeleteSavedCourse = (courseId) => {
    const updatedCourses = mySavedCourses.filter(c => c.id !== courseId);
    setMySavedCourses(updatedCourses);
    if (user) {
      localStorage.setItem(`sahara_saved_${user.email}`, JSON.stringify(updatedCourses));
    }
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()
    if (!loginForm.email.trim() || !loginForm.password.trim()) return;
    const nickname = loginForm.email.split('@')[0]
    setUser({ email: loginForm.email, nickname, isPremium: false })
    setLoginForm({ email: '', password: '' })
    setIsLoginOpen(false)
  }

  const handleLogout = () => {
    setUser(null)
    setIsMyPageOpen(false)
    setSelectedDetailCourse(null)
  }

  const handlePremiumUpgrade = () => {
    setUser(prev => ({ ...prev, isPremium: true }));
    setIsPremiumModalOpen(false);
    // 🌟 [수정] 기본 alert 대체
    showAlert('업그레이드 완료', '👑 프리미엄 업그레이드가 완료되었습니다!\n이제 무제한 & 광고 없는 코스를 즐기세요.');
  }

  const handleSemiPackageClick = (e) => {
    e.preventDefault();
    if (!user) {
      // 🌟 [수정] 기본 alert 대체
      showAlert('로그인 필요', '세미패키지 원스톱 예약 시스템을 이용하시려면 먼저 로그인해주세요. 🔒', () => setIsLoginOpen(true));
      return;
    }
    
    if (!user.isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    if (mySavedCourses.length === 0) {
      // 🌟 [수정] 기본 alert 대체
      showAlert('안내', '보관함에 저장된 맞춤 코스가 없습니다.\n먼저 마음에 드는 코스를 [내 일정에 저장하기] 해주세요! 🗺️');
      return;
    }

    setIsBookingModalOpen(true);
  }

  return (
    <main className="app">
      
      {/* 🌟 [추가] 앱 전체에서 사용되는 커스텀 시스템 모달 (Alert & Prompt) */}
      {sysModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 10005, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px 25px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', position: 'relative' }}>
            
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>
              {sysModal.type === 'prompt' ? '✍️' : '🔔'}
            </div>
            
            <h3 style={{ margin: '0 0 10px 0', color: '#1a202c', fontSize: '1.4rem' }}>{sysModal.title}</h3>
            <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
              {sysModal.message}
            </p>

            {/* 입력창 (Prompt 모드일 때만 활성화) */}
            {sysModal.type === 'prompt' && (
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="예: 스타벅스 성수점"
                style={{ width: '100%', padding: '14px', marginBottom: '25px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }}
                autoFocus
              />
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {sysModal.type === 'prompt' && (
                <button
                  onClick={() => setSysModal({ ...sysModal, isOpen: false })}
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#edf2f7', color: '#4a5568', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                  onMouseOut={(e) => e.target.style.background = '#edf2f7'}
                >
                  취소
                </button>
              )}
              <button
                onClick={() => {
                  if (sysModal.type === 'prompt') {
                    if (sysModal.onConfirm) sysModal.onConfirm(promptInput);
                  } else {
                    if (sysModal.onConfirm) sysModal.onConfirm();
                  }
                  setSysModal({ ...sysModal, isOpen: false });
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#0056b3', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="nav">
        <div className="brand"><span className="brand-icon">◎</span><strong>Sahara</strong></div>
        <nav className="nav-menu" aria-label="주요 메뉴">
          <a href="#travel-input">AI 코스추천</a>
          <a href="#recommendations" onClick={restoreInfluencerCourses}>인플루언서 코스</a>
          <a href="#" onClick={handleSemiPackageClick}>세미패키지</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setIsMyPageOpen(true)} 
                style={{ background: user.isPremium ? '#fffaf0' : '#ebf8ff', color: user.isPremium ? '#dd6b20' : '#2b6cb0', padding: '8px 16px', borderRadius: '20px', border: user.isPremium ? '1px solid #fbd38d' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🎒 {user.nickname}님의 보관함 {user.isPremium && '👑'}
              </button>
              <button type="button" onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer' }}>로그아웃</button>
            </div>
          ) : (
            <button type="button" className="login-button" onClick={() => setIsLoginOpen(true)}>로그인</button>
          )}
          <a href="#travel-input" className="start-button">시작하기</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">AI 기반 초개인화 큐레이션</p>
          <h1>정보의 사막에서<br /><span>나만의 여행 루트를 찾다</span></h1>
          <p>목적지, 일정, 동반자, 여행 컨셉만 입력하면 Sahara가 3가지 테마별 일정과 지도 동선을 한 번에 추천합니다.</p>
          <div className="hero-actions">
            <a href="#travel-input" className="primary-link">맞춤 코스 생성하기</a>
            <a href="#recommendations" className="secondary-link" onClick={restoreInfluencerCourses}>인플루언서 코스 보기</a>
          </div>
        </div>

        <div className="hero-visual" aria-label="AI 추천 동선 미리보기">
          <div className="floating-card small"><span className="pin-dot">◎</span><div><strong>숨겨진 오아시스 스팟</strong><p>당신의 취향 98% 일치</p></div></div>
          <div className="route-preview-card">
            <div className="route-card-header"><span className="route-icon">⌘</span><div><strong>최적화된 동선</strong><p>AI가 분석한 효율적인 루트</p></div><em>-45분 절약</em></div>
            <div className="route-map"><span className="marker one" /><i /><span className="marker two" /><i /><span className="marker three" /></div>
            <div className="route-list"><p><b>1</b> 오아시스 힐링 코스</p><p><b>2</b> 로컬 미식 코스</p><p><b>3</b> 액티비티 탐험 코스</p></div>
          </div>
          <div className="floating-card status"><span />실시간 큐레이션 중...</div>
        </div>
      </section>

      <section className="search-card" id="travel-input">
        <TravelForm onGenerate={handleGenerate} isLoading={isLoading} />
        {errorMessage && <p className="form-errors" role="alert">{errorMessage}</p>}
      </section>

      <section className="summary-row" aria-label="추천 요약">
        <div><strong>{recommendations.length || 3}개</strong><span>추천 코스</span></div>
        <div><strong>{mySavedCourses.length}개</strong><span>내 일정 추가</span></div>
        <div><strong>{matchRatePercent}%</strong><span>추천 저장률</span></div>
      </section>

      <section className="recommendation-section" id="recommendations" style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div className="section-heading">
          <h2>1분 만에 완성된 <span>3가지 맞춤 코스</span></h2>
          <p>입력하신 조건과 취향을 바탕으로 일정표, 주요 장소, 추천 이유를 비교해보세요.</p>
        </div>

        <div className="recommendation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '40px', width: '100%', marginTop: '40px' }}>
          {visibleRecommendations.map((course, index) => {
            const isAdded = mySavedCourses.some(c => c.id === course.id);
            const imageClass = ['oasis', 'food', 'activity'][index] || 'oasis'
            
            const repImage = course.headerImg || `https://picsum.photos/seed/${encodeURIComponent(course.theme)}/800/400`;

            return (
              <article className="recommendation-card" key={course.id} style={{ textAlign: 'left', backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.06)', border: 'none', display: 'flex', flexDirection: 'column' }}>
                
                <div className={`course-image ${imageClass}`} style={{ position: 'relative', height: '220px', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                  <img src={repImage} alt="테마 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {course.influencerCourse && <span className="course-badge" style={{ position: 'absolute', top: '15px', left: '15px', background: '#e53e3e', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 }}>인플루언서 추천</span>}
                </div>

                <div className="course-content" style={{ padding: '36px 32px', textAlign: 'left', flex: 1 }}>
                  <p className="course-meta" style={{ textAlign: 'left' }}>◎ {course.estimatedTime}</p>
                  <h3 style={{ textAlign: 'left' }}>{course.theme}</h3>
                  <p style={{ textAlign: 'left' }}>{course.description}</p>

                  <div className="day-preview" style={{ marginTop: '24px', textAlign: 'left' }}>
                    {course.days.map((day, dIndex) => {
                      const theme = DAY_THEMES[dIndex % DAY_THEMES.length];

                      return (
                        <div key={day.day} className="day-block" style={{ marginBottom: '32px', textAlign: 'left' }}>
                          <h4 style={{ 
                            fontSize: '1.3rem', color: theme.main, fontWeight: 'bold', marginBottom: '16px', 
                            borderBottom: `2px solid ${theme.bg}`, paddingBottom: '8px', textAlign: 'left', clear: 'both' 
                          }}>
                            {day.day}
                          </h4>
                          
                          <div style={{ position: 'relative', paddingLeft: '24px', marginLeft: '12px', borderLeft: `2px solid ${theme.bg}`, textAlign: 'left', display: 'block' }}>
                            
                            {day.schedules.map((schedule, sIndex) => {
                              const finalImageSrc = schedule.tourApiImg || `https://picsum.photos/seed/${encodeURIComponent(schedule.place)}/120/120`;

                              return (
                                <div key={sIndex} style={{ display: 'block', textAlign: 'left', marginBottom: '0' }}>
                                  <div style={{ 
                                    position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'stretch', 
                                    padding: '16px', borderBottom: '1px dashed #edf2f7', textAlign: 'left', width: '100%', boxSizing: 'border-box',
                                    backgroundColor: schedule.isAd ? '#f7fafc' : 'transparent', borderRadius: schedule.isAd ? '8px' : '0'
                                  }}>
                                    
                                    <div style={{ 
                                      position: 'absolute', left: '-31px', top: '50%', transform: 'translateY(-50%)', 
                                      width: '12px', height: '12px', background: theme.main, borderRadius: '50%', border: '2px solid #fff', zIndex: 2 
                                    }} />
                                    
                                    <div style={{ position: 'relative', marginRight: '16px', flexShrink: 0, alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <img src={finalImageSrc} alt={schedule.place} style={{ 
                                        width: '64px', height: '64px', minWidth: '64px', objectFit: 'cover', borderRadius: '10px', display: 'block' 
                                      }} />
                                      <div style={{
                                        position: 'absolute', top: '-6px', left: '-6px', width: '22px', height: '22px',
                                        background: theme.main, color: 'white', borderRadius: '50%', border: '2px solid white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 3
                                      }}>
                                        {schedule.isAd ? '⭐' : sIndex + 1}
                                      </div>
                                      
                                      {schedule.isAd && (
                                        <div style={{ marginTop: '4px', fontSize: '0.65rem', color: '#a0aec0', fontWeight: 'bold', letterSpacing: '1px' }}>AD</div>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left', paddingRight: '10px', justifyContent: 'center' }}>
                                      <h5 style={{ 
                                        margin: '0 0 6px 0', fontSize: '1rem', color: '#1a202c', fontWeight: 'bold', 
                                        textAlign: 'left', wordBreak: 'keep-all', overflowWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' 
                                      }}>
                                        {schedule.place}
                                      </h5>
                                      <span style={{ fontSize: '0.8rem', color: '#718096', textAlign: 'left', display: 'block', marginBottom: '6px' }}>
                                        {schedule.category}
                                      </span>
                                      
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        {schedule.cost > 0 && (
                                          <span style={{ background: '#fefcbf', color: '#c05621', padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            💰 {schedule.cost.toLocaleString()}원
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto', flexShrink: 0, alignSelf: 'center', minWidth: '70px' }}>
                                      <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', justifyContent: 'center' }}>
                                        <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'up')} disabled={sIndex === 0} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: sIndex === 0 ? '#cbd5e0' : '#4a5568', cursor: sIndex === 0 ? 'default' : 'pointer', fontSize: '0.8rem', margin: 0, float: 'none' }}>▲</button>
                                        <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'down')} disabled={sIndex === day.schedules.length - 1} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: sIndex === day.schedules.length - 1 ? '#cbd5e0' : '#4a5568', cursor: sIndex === day.schedules.length - 1 ? 'default' : 'pointer', fontSize: '0.8rem', margin: 0, float: 'none' }}>▼</button>
                                      </div>
                                      <button onClick={() => deleteSchedule(course.id, dIndex, sIndex)} style={{ padding: '6px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', margin: 0, float: 'none' }}>
                                        삭제
                                      </button>
                                    </div>

                                  </div>

                                  {sIndex < day.schedules.length - 1 && schedule.transit && schedule.transit !== '일정 종료' && (
                                    <div style={{ position: 'relative', padding: '12px 0 12px 16px', display: 'flex', alignItems: 'center', textAlign: 'left', color: '#3182ce', fontSize: '0.85rem', fontWeight: 'bold', clear: 'both' }}>
                                      <span style={{ marginRight: '8px', fontSize: '1.1rem' }}>🚕</span> {schedule.transit}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            
                            <button onClick={() => addSchedule(course.id, dIndex)} style={{ 
                              width: '100%', padding: '12px', background: 'transparent', border: '2px dashed #cbd5e0', 
                              color: '#718096', borderRadius: '8px', cursor: 'pointer', marginTop: '16px', marginBottom: '8px',
                              fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', clear: 'both'
                            }}
                            onMouseOver={(e) => { e.target.style.background = '#f8fafc'; e.target.style.color = '#4a5568'; e.target.style.border = '2px dashed #a0aec0'; }}
                            onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#718096'; e.target.style.border = '2px dashed #cbd5e0'; }}>
                              + 이 날짜에 장소 추가하기
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {course.days.length > 0 && (
                     <div style={{ marginTop: '20px' }}>
                       <CourseMap places={course.days.flatMap(day => day.schedules)} />
                     </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddCourse(course.id)}
                    disabled={isAdded}
                    className={`save-btn ${isAdded ? 'added' : ''}`}
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: isAdded ? 'default' : 'pointer', backgroundColor: isAdded ? '#e2e8f0' : '#0056b3', color: isAdded ? '#a0aec0' : '#ffffff', border: 'none', marginTop: '1rem', transition: 'all 0.2s ease', fontSize: '1rem', clear: 'both' }}
                  >
                    {isAdded ? '✅ 내 일정에 추가됨' : '🤍 내 일정에 저장하기'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* 보관함 창 모달 */}
      {isMyPageOpen && user && (
        <div className="mypage-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <section className="mypage-modal" style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button type="button" onClick={() => setIsMyPageOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>×</button>
            
            <div style={{ marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1a202c', margin: '0 0 0.5rem 0' }}>🎒 {user.nickname}님의 여행 보관함 {user.isPremium && '👑'}</h2>
              <p style={{ color: '#718096', margin: 0 }}>저장하신 코스들을 이곳에서 모두 확인하고 관리하세요.</p>
              {!user.isPremium && (
                <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '10px', fontWeight: 'bold' }}>
                  * 무료 회원은 최대 {FREE_MAX_SAVE}개까지만 저장할 수 있습니다. ({mySavedCourses.length}/{FREE_MAX_SAVE})
                </p>
              )}
            </div>
            
            {mySavedCourses.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏜️</div>
                <h3 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>아직 저장된 일정이 없습니다.</h3>
                <p style={{ color: '#a0aec0' }}>마음에 드는 코스를 찾아 [내 일정에 저장하기]를 눌러보세요!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {mySavedCourses.map(course => (
                  <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', borderLeft: '6px solid #0056b3' }}>
                    
                    <div 
                      style={{ flex: 1, cursor: 'pointer' }} 
                      onClick={() => setSelectedDetailCourse(course)}
                      onMouseOver={(e) => e.currentTarget.querySelector('h4').style.color = '#3182ce'}
                      onMouseOut={(e) => e.currentTarget.querySelector('h4').style.color = '#2d3748'}
                    >
                      <span style={{ fontSize: '0.8rem', background: '#ebf8ff', color: '#2b6cb0', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>{course.days.length}일 코스</span>
                      <h4 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.2rem', transition: 'color 0.2s' }}>
                        {course.theme} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#a0aec0', marginLeft: '6px' }}>상세보기 〉</span>
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#718096', fontWeight: '500' }}>
                        {course.estimatedTime}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteSavedCourse(course.id)}
                      style={{ background: '#fff0f2', color: '#e53e3e', border: '1px solid #fed7d7', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', whiteSpace: 'nowrap', marginLeft: '20px' }}
                      onMouseOver={(e) => e.target.style.background = '#fed7d7'}
                      onMouseOut={(e) => e.target.style.background = '#fff0f2'}
                    >
                      삭제하기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 보관함 상세 모달 */}
      {selectedDetailCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 10001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <button onClick={() => setSelectedDetailCourse(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>×</button>
            
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img src={selectedDetailCourse.headerImg || `https://picsum.photos/seed/${encodeURIComponent(selectedDetailCourse.theme)}/800/400`} alt="테마" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            
            <div style={{ padding: '30px', textAlign: 'left' }}>
              <p style={{ margin: '0 0 10px 0', color: '#718096', fontWeight: 'bold' }}>{selectedDetailCourse.estimatedTime}</p>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', color: '#1a202c' }}>{selectedDetailCourse.theme}</h2>
              <p style={{ margin: '0 0 30px 0', fontSize: '1rem', color: '#4a5568', lineHeight: '1.6' }}>{selectedDetailCourse.description}</p>
              
              {selectedDetailCourse.days.map((day, dIndex) => {
                const theme = DAY_THEMES[dIndex % DAY_THEMES.length];
                return (
                  <div key={day.day} style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '1.4rem', color: theme.main, fontWeight: 'bold', marginBottom: '20px', borderBottom: `2px solid ${theme.bg}`, paddingBottom: '10px' }}>{day.day}</h4>
                    
                    <div style={{ position: 'relative', paddingLeft: '24px', marginLeft: '12px', borderLeft: `2px solid ${theme.bg}` }}>
                      {day.schedules.map((schedule, sIndex) => {
                        const finalImageSrc = schedule.tourApiImg || `https://picsum.photos/seed/${encodeURIComponent(schedule.place)}/120/120`;
                        return (
                          <div key={sIndex} style={{ position: 'relative', padding: '16px 0', borderBottom: sIndex < day.schedules.length - 1 ? '1px dashed #edf2f7' : 'none' }}>
                             <div style={{ position: 'absolute', left: '-31px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', background: theme.main, borderRadius: '50%', border: '2px solid #fff', zIndex: 2 }} />
                             
                             <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ position: 'relative', marginRight: '20px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <img src={finalImageSrc} alt={schedule.place} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '12px' }} />
                                  <div style={{ position: 'absolute', top: '-8px', left: '-8px', width: '24px', height: '24px', background: theme.main, color: 'white', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 3 }}>
                                    {schedule.isAd ? '⭐' : sIndex + 1}
                                  </div>
                                  {schedule.isAd && <div style={{ marginTop: '4px', fontSize: '0.65rem', color: '#a0aec0', fontWeight: 'bold' }}>AD</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h5 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#2d3748', fontWeight: 'bold' }}>{schedule.place}</h5>
                                  <span style={{ fontSize: '0.85rem', color: '#718096', display: 'inline-block', marginRight: '10px' }}>{schedule.category}</span>
                                  {schedule.cost > 0 && <span style={{ background: '#fefcbf', color: '#c05621', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>💰 {schedule.cost.toLocaleString()}원</span>}
                                </div>
                             </div>
                             
                             {sIndex < day.schedules.length - 1 && schedule.transit && schedule.transit !== '일정 종료' && (
                               <div style={{ padding: '16px 0 0 16px', color: '#3182ce', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                 <span style={{ marginRight: '8px' }}>🚕</span> {schedule.transit}
                               </div>
                             )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {selectedDetailCourse.days.length > 0 && (
                 <div style={{ marginTop: '20px' }}>
                   <CourseMap places={selectedDetailCourse.days.flatMap(day => day.schedules)} />
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 프리미엄 유도 모달 */}
      {isPremiumModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 10002, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '40px 30px', borderRadius: '20px', width: '90%', maxWidth: '450px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setIsPremiumModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>👑</div>
            <h2 style={{ fontSize: '1.8rem', color: '#1a202c', marginBottom: '10px' }}>Sahara 프리미엄 패스</h2>
            <p style={{ color: '#718096', marginBottom: '30px', lineHeight: '1.5' }}>
              무료 회원의 혜택이 제한되었습니다.<br/>프리미엄으로 업그레이드하고 무제한 혜택을 누리세요!
            </p>
            
            <div style={{ background: '#faf5ff', border: '1px solid #d6bcfa', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '30px' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#553c9a', fontWeight: '500', lineHeight: '2' }}>
                <li>✅ <b>VIP 세미패키지 원스톱 예약 대행</b></li>
                <li>✅ <b>무제한</b> AI 맞춤 코스 생성/저장</li>
                <li>✅ 스폰서 <b>광고 없는</b> 클린한 일정표</li>
              </ul>
            </div>

            <button onClick={handlePremiumUpgrade} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #805ad5 0%, #d6bcfa 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(128, 90, 213, 0.4)' }}>
              무료로 체험해보기 (데모)
            </button>
            <button onClick={() => setIsPremiumModalOpen(false)} style={{ width: '100%', padding: '16px', background: 'transparent', color: '#a0aec0', border: 'none', marginTop: '10px', fontSize: '0.95rem', cursor: 'pointer' }}>
              다음에 할게요
            </button>
          </div>
        </div>
      )}

      {/* VIP 예약 대행 모달창 */}
      {isBookingModalOpen && user?.isPremium && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 10003, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '40px 30px', borderRadius: '20px', width: '90%', maxWidth: '500px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setIsBookingModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
            
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✈️</div>
            <h2 style={{ fontSize: '1.8rem', color: '#1a202c', marginBottom: '10px' }}>VIP 원스톱 예약 시스템</h2>
            <p style={{ color: '#718096', marginBottom: '20px', lineHeight: '1.5' }}>
              프리미엄 회원님을 위한 전담 컨시어지가<br/>아래 일정의 항공/숙박/렌터카 예약을 대행해 드립니다.
            </p>
            
            <div style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', textAlign: 'left', marginBottom: '25px', maxHeight: '180px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#a0aec0', fontWeight: 'bold' }}>예약 요청 목록</p>
              {mySavedCourses.map((c, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < mySavedCourses.length -1 ? '1px dashed #cbd5e0' : 'none', color: '#2d3748', fontWeight: 'bold' }}>
                  ✔️ {c.theme} <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 'normal', marginLeft: '6px' }}>({c.estimatedTime})</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { 
                setIsBookingModalOpen(false); 
                // 🌟 [수정] 기존 alert을 시스템 모달로 교체
                showAlert('예약 요청 완료', '전담 컨시어지에게 견적 및 예약 대행 요청이 성공적으로 전송되었습니다!\n빠른 시일 내에 기입하신 이메일로 안내해 드리겠습니다. 🎉');
              }} 
              style={{ width: '100%', padding: '16px', background: '#1a202c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}
            >
              예약 및 견적서 요청하기
            </button>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginOpen && (
        <div className="login-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <section className="login-modal" aria-label="로그인 창" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', position: 'relative', zIndex: 10000, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <button type="button" onClick={() => setIsLoginOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
            <div className="login-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <span className="brand-icon" style={{ fontSize: '2.5rem', color: '#0056b3' }}>◎</span>
              <h2 style={{ margin: '10px 0 5px 0', color: '#1a202c' }}>Sahara 로그인</h2>
              <p style={{ fontSize: '0.9rem', color: '#718096', marginTop: '5px' }}>로그인 후 나만의 여행 코스를 만드세요.</p>
            </div>
            <form className="login-form" onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input name="email" type="email" value={loginForm.email} onChange={handleLoginChange} placeholder="이메일 입력 (예: admin@sahara.com)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <input name="password" type="password" value={loginForm.password} onChange={handleLoginChange} placeholder="비밀번호 입력" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <button type="submit" style={{ padding: '14px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>시작하기</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default MainPage