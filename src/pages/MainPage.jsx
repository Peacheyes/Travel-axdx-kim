// src/App.jsx
import { useMemo, useState, useEffect } from 'react'
import TravelForm from '../components/TravelForm'
import { createRecommendations } from '../lib/recommendation'
import { calculateRecommendationMatchRate } from '../lib/kpi'
import { getSaharaRecommendation } from '../api/saharaService'
import CourseMap from '../components/CourseMap'
import { supabase } from '../lib/supabaseClient' // 👈 Supabase 연결 통로 가져오기
import '../App.css'

const previewInput = {
  destination: '제주도',
  startDate: '2026-06-12',
  endDate: '2026-06-14',
  companion: '친구',
  concept: '힐링',
}

function MainPage() {
  const [recommendations, setRecommendations] = useState([])
  const [addedCourseIds, setAddedCourseIds] = useState(() => {
    const savedData = localStorage.getItem('sahara_saved_courses')
    return savedData ? JSON.parse(savedData) : []
  })

  useEffect(() => {
    localStorage.setItem('sahara_saved_courses', JSON.stringify(addedCourseIds))
  }, [addedCourseIds]
)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

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

  const savedCourses = recommendations.filter(course => addedCourseIds.includes(course.id))

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
      
      const formattedResults = aiData.map((item, index) => {
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

 const handleAddCourse = async (courseId) => {
    if (!user) {
      setIsLoginOpen(true)
      return
    }

    // 1. 현재 화면에 표시된 추천 코스들 중 사용자가 클릭한 코스의 상세 정보 찾기
    const selectedCourse = visibleRecommendations.find(c => c.id === courseId)
    if (!selectedCourse) return

    // 2. 숫자로 된 경비 데이터 추출 (정규식을 통해 '원'이나 쉼표를 제거하고 순수 숫자만 추출)
    const budgetString = selectedCourse.estimatedTime.replace(/[^0-9]/g, '')
    const numericBudget = Number(budgetString) || 0

    try {
      // 3. 🚀 Supabase 실시간 데이터베이스에 데이터 집어넣기 (INSERT)
      const { error } = await supabase
        .from('saved_courses')
        .insert([
          { 
            id: selectedCourse.id, 
            theme: selectedCourse.theme, 
            concept: previewInput.concept || '일반', // 현재 선택된 여행 컨셉
            total_budget: numericBudget
          }
        ])

      if (error) throw error

      // 4. DB 저장이 성공하면 화면 상태(UI) 업데이트
      setAddedCourseIds((prev) => {
        if (prev.includes(courseId)) return prev
        return [...prev, courseId]
      })
      
      alert('코스가 클라우드 데이터베이스에 안전하게 저장되었습니다! 🎒')

    } catch (error) {
      console.error('Supabase 저장 실패 상세 로그:', error)
      alert('데이터베이스 연결 중 문제가 발생했습니다. 로컬 상태로만 저장됩니다.')
      
      // 만약 네트워크나 DB 장애가 나더라도 사용자 경험이 끊기지 않도록 폴백(Fallback) 처리
      setAddedCourseIds((prev) => [...prev, courseId])
    }
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
              <p><b>1</b> 오아시스 힐링 코스</p>
              <p><b>2</b> 로컬 미식 코스</p>
              <p><b>3</b> 액티비티 탐험 코스</p>
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
                      <div key={day.day} className="day-block">
                        <span className="day-title">{day.day}</span>
                        
                        <div className="schedule-list">
                          {day.schedules.map((schedule, sIndex) => (
                            <div key={sIndex} className="schedule-item">
                              <p className="schedule-place">
                                {schedule.place}
                                {schedule.category && (
                                  <span className="schedule-category">
                                    {schedule.category}
                                  </span>
                                )}
                              </p>
                              
                              <div className="schedule-tags">
                                {schedule.cost > 0 && (
                                  <span className="tag cost">
                                    💰 {schedule.cost.toLocaleString()}원
                                  </span>
                                )}
                                {schedule.transit && schedule.transit !== '일정 종료' && (
                                  <span className="tag transit">
                                    🚶‍♂️ {schedule.transit}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 객체 데이터 전체(장소명, 카테고리 등)를 그대로 지도에 전달! */}
                    {course.days.length > 0 && (
                      <CourseMap places={course.days.flatMap(day => day.schedules)} />
                    )}

                  <button
                    type="button"
                    onClick={() => handleAddCourse(course.id)}
                    disabled={isAdded}
                  >
                    {isAdded ? '✅ 내 일정에 추가됨' : '🤍 내 일정에 저장하기'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

{/* 👇 Phase 3: 내 일정 보관함 (장바구니) 추가 영역 */}
      {savedCourses.length > 0 && (
        <section className="saved-courses-section" id="my-schedule" style={{ 
          maxWidth: '1200px', margin: '3rem auto', padding: '2rem', 
          backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e2e8f0' 
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#1a202c', margin: '0 0 0.5rem 0' }}>🎒 내 일정 보관함</h2>
            <p style={{ color: '#718096', margin: 0 }}>저장하신 맞춤 코스들을 확인하고 관리하세요.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {savedCourses.map(course => (
              <div key={course.id} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: 'white', padding: '20px', borderRadius: '8px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #0056b3'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>{course.theme}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>
                    {course.estimatedTime} <span style={{ color: '#cbd5e0', margin: '0 8px' }}>|</span> 총 {course.days.length}일 일정
                  </p>
                </div>
                
                <button
                  onClick={() => setAddedCourseIds(prev => prev.filter(id => id !== course.id))}
                  style={{ 
                    background: '#fff0f2', color: '#e53e3e', border: '1px solid #fed7d7', 
                    padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', 
                    fontWeight: 'bold', transition: 'all 0.2s' 
                  }}
                  onMouseOver={(e) => e.target.style.background = '#fed7d7'}
                  onMouseOut={(e) => e.target.style.background = '#fff0f2'}
                >
                  삭제하기
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 👆 내 일정 보관함 영역 끝 */}

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

export default MainPage