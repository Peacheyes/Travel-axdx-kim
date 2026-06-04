// src/App.jsx
import { useMemo, useState } from 'react'
import TravelForm from './components/TravelForm'
import { createRecommendations } from './lib/recommendation' // 기존 프리뷰 유지를 위해 남겨둠
import { calculateRecommendationMatchRate } from './lib/kpi'
import { getSaharaRecommendation } from './api/saharaService' // 👈 1. 우리가 만든 AI 서비스 불러오기
import CourseMap from './components/CourseMap'
import './App.css'

const previewInput = {
  destination: '제주도',
  startDate: '2026-06-12',
  endDate: '2026-06-14',
  companion: '친구',
  concept: '힐링',
}

function App() {
  const [recommendations, setRecommendations] = useState([])
  const [addedCourseIds, setAddedCourseIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  // (기존 유지) 첫 화면에서 보여줄 미리보기용 더미 데이터
  const previewRecommendations = useMemo(() => {
    return createRecommendations(previewInput)
  }, [])

  const visibleRecommendations =
    recommendations.length > 0 ? recommendations : previewRecommendations

  const matchRate = useMemo(() => {
    return calculateRecommendationMatchRate(
      addedCourseIds.length,
      recommendations.length,
    )
  }, [addedCourseIds.length, recommendations.length])

  const matchRatePercent = Math.round(matchRate * 100)

  // 👈 2. AI와 통신하기 위해 async/await 구문으로 변경
  // 👈 기존의 지저분하게 중복된 코드를 모두 지우고 이 부분으로 덮어씌우세요!
  const handleGenerate = async (input) => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const scheduleText = `${input.startDate} 부터 ${input.endDate} 까지`
      
      const aiData = await getSaharaRecommendation(
        input.destination,
        scheduleText,
        input.companion,
        input.concept
      )
      
      // 고도화된 JSON 데이터를 기존 UI 모델에 맞게 변환 (데이터 정제 및 안전성 강화)
      const formattedResults = aiData.map((item, index) => {
        // AI가 예산을 누락하거나 문자로 줬을 경우를 대비한 안전 장치 (에러 방지)
        const safeBudget = Number(item.totalBudget) || 0; 

        return {
          id: `ai-course-${Date.now()}-${index}`,
          influencerCourse: false,
          estimatedTime: `예상 총 경비: ${safeBudget.toLocaleString()}원`,
          theme: item.themeName || '맞춤 테마',
          description: item.themeDescription || '',
          days: (item.itinerary || []).map((dayPlan) => ({
            day: `Day ${dayPlan.day}`,
            schedules: (dayPlan.places || []).map((place) => {
              // 개별 장소 경비도 숫자로 강제 변환
              const safeCost = Number(place.estimatedCost) || 0;
              return {
                place: place.placeName || '장소명 없음',
                category: place.category || '',
                transit: place.transitInfo || '',
                cost: safeCost
              }
            })
          }))
        }
      })

      setRecommendations(formattedResults)
      setAddedCourseIds([])
    } catch (error) {
      console.error("AI 생성 에러 상세 로그:", error)
      setErrorMessage('코스 최적화 중 문제가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCourse = (courseId) => {
    if (!user) {
      setIsLoginOpen(true)
      return
    }
    
    setAddedCourseIds((prev) => {
      if (prev.includes(courseId)) {
        return prev
      }

      return [...prev, courseId]
    })
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      return
    }

    const nickname = loginForm.email.split('@')[0]

    setUser({
      email: loginForm.email,
      nickname,
    })

    setLoginForm({
      email: '',
      password: '',
    })

    setIsLoginOpen(false)
  }

  const handleLogout = () => {
    setUser(null)
    setAddedCourseIds([])
  }

  return (
    <main className="app">
      <header className="nav">
        <div className="brand">
          <span className="brand-icon">◎</span>
          <strong>Sahara</strong>
        </div>

        <nav className="nav-menu" aria-label="주요 메뉴">
          <a href="#travel-input">AI 코스추천</a>
          <a href="#recommendations">인플루언서 코스</a>
          <a href="#recommendations">세미패키지</a>
        </nav>

        <div className="nav-actions">
          {user ? (
            <div className="user-menu">
              <span>{user.nickname}님</span>
              <button type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="login-button"
              onClick={() => setIsLoginOpen(true)}
            >
              로그인
            </button>
          )}

          <a href="#travel-input" className="start-button">
            시작하기
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">AI 기반 초개인화 큐레이션</p>

          <h1>
            정보의 사막에서
            <br />
            <span>나만의 여행 루트를 찾다</span>
          </h1>

          <p>
            목적지, 일정, 동반자, 여행 컨셉만 입력하면 Sahara가 3가지
            테마별 일정과 지도 동선을 한 번에 추천합니다.
          </p>

          <div className="hero-actions">
            <a href="#travel-input" className="primary-link">
              맞춤 코스 생성하기
            </a>
            <a href="#recommendations" className="secondary-link">
              인플루언서 코스 보기
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="AI 추천 동선 미리보기">
          <div className="floating-card small">
            <span className="pin-dot">◎</span>
            <div>
              <strong>숨겨진 오아시스 스팟</strong>
              <p>당신의 취향 98% 일치</p>
            </div>
          </div>

          <div className="route-preview-card">
            <div className="route-card-header">
              <span className="route-icon">⌘</span>
              <div>
                <strong>최적화된 동선</strong>
                <p>AI가 분석한 효율적인 루트</p>
              </div>
              <em>-45분 절약</em>
            </div>

            <div className="route-map">
              <span className="marker one" />
              <i />
              <span className="marker two" />
              <i />
              <span className="marker three" />
            </div>

            <div className="route-list">
              <p>
                <b>1</b>
                오아시스 힐링 코스
              </p>
              <p>
                <b>2</b>
                로컬 미식 코스
              </p>
              <p>
                <b>3</b>
                액티비티 탐험 코스
              </p>
            </div>
          </div>

          <div className="floating-card status">
            <span />
            실시간 큐레이션 중...
          </div>
        </div>
      </section>

      <section className="search-card" id="travel-input">
        <TravelForm onGenerate={handleGenerate} isLoading={isLoading} />

        {errorMessage && (
          <p className="form-errors" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      <section className="summary-row" aria-label="추천 요약">
        <div>
          <strong>{recommendations.length || 3}개</strong>
          <span>추천 코스</span>
        </div>
        <div>
          <strong>{addedCourseIds.length}개</strong>
          <span>내 일정 추가</span>
        </div>
        <div>
          <strong>{matchRatePercent}%</strong>
          <span>추천 저장률</span>
        </div>
      </section>

      <section className="recommendation-section" id="recommendations">
        <div className="section-heading">
          <h2>
            5초 만에 완성된 <span>3가지 맞춤 코스</span>
          </h2>
          <p>
            입력하신 조건과 취향을 바탕으로 일정표, 주요 장소, 추천 이유를
            비교해보세요.
          </p>
        </div>

        <div className="recommendation-grid">
          {visibleRecommendations.map((course, index) => {
            const isAdded = addedCourseIds.includes(course.id)
            const imageClass = ['oasis', 'food', 'activity'][index] || 'oasis'

            return (
              <article className="recommendation-card" key={course.id}>
                <div className={`course-image ${imageClass}`}>
                  {course.influencerCourse && (
                    <span className="course-badge">인플루언서 추천</span>
                  )}
                </div>

                <div className="course-content">
                  <p className="course-meta">◎ {course.estimatedTime}</p>
                  <h3>{course.theme}</h3>
                  <p>{course.description}</p>

                <div className="day-preview">
                    {course.days.map((day) => (
                      <div key={day.day} style={{ marginBottom: '15px' }}>
                        <span style={{ fontWeight: 'bold', color: '#007BFF', display: 'block', marginBottom: '8px' }}>
                          {day.day}
                        </span>
                        
                        {/* 첫 번째 장소만 보여주던 구조에서 -> 모든 장소의 최적화된 동선(노드)을 나열하도록 변경 */}
                        {day.schedules.map((schedule, sIndex) => (
                          <div key={sIndex} style={{ 
                            margin: '10px 0', 
                            paddingLeft: '10px', 
                            borderLeft: '2px solid #eee' 
                          }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: '500' }}>
                              {schedule.place} 
                              {schedule.category && (
                                <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '5px' }}>
                                  ({schedule.category})
                                </span>
                              )}
                            </p>
                            
                            <div style={{ fontSize: '0.85em', color: '#666' }}>
                              {schedule.cost > 0 && (
                                <span style={{ marginRight: '10px' }}>💰 {schedule.cost.toLocaleString()}원</span>
                              )}
                              {schedule.transit && schedule.transit !== '일정 종료' && (
                                <span>🚶‍♂️ ➡️ {schedule.transit}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* course의 모든 장소 이름만 뽑아서 배열로 만든 뒤 지도에 전달 */}
                  {course.days.length > 0 && (
                    <CourseMap places={course.days.flatMap(day => day.schedules.map(s => s.place))} />
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddCourse(course.id)}
                    disabled={isAdded}
                  >
                    {isAdded ? '내 일정에 추가됨' : '코스 상세보기'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {isLoginOpen && (
        <div className="login-modal-backdrop">
          <section className="login-modal" aria-label="로그인 창">
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsLoginOpen(false)}
            >
              ×
            </button>

            <div className="login-modal-header">
              <span className="brand-icon">◎</span>
              <h2>Sahara 로그인</h2>
              <p>로그인하면 추천 코스를 내 일정에 저장할 수 있습니다.</p>
            </div>

            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="example@email.com"
              />

              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="비밀번호 입력"
              />

              <button type="submit">로그인</button>
            </form>

            <p className="login-help">
              MVP 시연용 로그인입니다. 실제 회원 인증은 향후 Supabase 또는
              Firebase로 확장할 수 있습니다.
            </p>
          </section>
        </div>
      )}
    </main>
  )
}

export default App