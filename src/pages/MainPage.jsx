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

function MainPage() {
  const [recommendations, setRecommendations] = useState(() => createRecommendations(previewInput))
  const [addedCourseIds, setAddedCourseIds] = useState(() => {
    const savedData = localStorage.getItem('sahara_saved_courses')
    return savedData ? JSON.parse(savedData) : []
  })

  useEffect(() => {
    localStorage.setItem('sahara_saved_courses', JSON.stringify(addedCourseIds))
  }, [addedCourseIds])

  const [currentConcept, setCurrentConcept] = useState(previewInput.concept)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const previewRecommendations = useMemo(() => {
    return createRecommendations(previewInput)
  }, [])

  const visibleRecommendations = recommendations.length > 0 ? recommendations : previewRecommendations

  const matchRate = useMemo(() => {
    return calculateRecommendationMatchRate(addedCourseIds.length, visibleRecommendations.length)
  }, [addedCourseIds.length, visibleRecommendations.length])

  const matchRatePercent = Math.round(matchRate * 100)
  const savedCourses = visibleRecommendations.filter(course => addedCourseIds.includes(course.id))

  const moveSchedule = (courseId, dayIndex, scheduleIndex, direction) => {
    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      const newSchedules = [...day.schedules];

      if (direction === 'up' && scheduleIndex > 0) {
        [newSchedules[scheduleIndex - 1], newSchedules[scheduleIndex]] = [newSchedules[scheduleIndex], newSchedules[scheduleIndex - 1]];
      } else if (direction === 'down' && scheduleIndex < newSchedules.length - 1) {
        [newSchedules[scheduleIndex], newSchedules[scheduleIndex + 1]] = [newSchedules[scheduleIndex + 1], newSchedules[scheduleIndex]];
      }

      day.schedules = newSchedules;
      newDays[dayIndex] = day;
      return { ...course, days: newDays };
    }));
  };

  const deleteSchedule = (courseId, dayIndex, scheduleIndex) => {
    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      day.schedules = day.schedules.filter((_, idx) => idx !== scheduleIndex);
      newDays[dayIndex] = day;
      return { ...course, days: newDays };
    }));
  };

  const addSchedule = (courseId, dayIndex) => {
    const newPlaceName = window.prompt("추가할 장소 이름을 입력하세요:");
    if (!newPlaceName || newPlaceName.trim() === '') return;

    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      day.schedules = [...day.schedules, { place: newPlaceName, category: '직접 추가', transit: '', cost: 0 }];
      newDays[dayIndex] = day;
      return { ...course, days: newDays };
    }));
  };

  const handleGenerate = async (input) => {
    setIsLoading(true)
    setErrorMessage('')
    setCurrentConcept(input.concept || '일반')

    try {
      const scheduleText = `${input.startDate} 부터 ${input.endDate} 까지`
      const aiData = await getSaharaRecommendation(input.destination, scheduleText, input.companion, input.concept)
      
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
              return { place: place.placeName || '장소명 없음', category: place.category || '', transit: place.transitInfo || '', cost: safeCost }
            })
          }))
        }
      })

      setRecommendations(formattedResults)
      setAddedCourseIds([])
    } catch (error) {
      setErrorMessage('코스 최적화 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCourse = async (courseId) => {
    if (!user) { setIsLoginOpen(true); return; }
    if (addedCourseIds.includes(courseId)) return;

    const selectedCourse = visibleRecommendations.find(c => c.id === courseId)
    if (!selectedCourse) return

    const numericBudget = Number(selectedCourse.estimatedTime.replace(/[^0-9]/g, '')) || 0

    try {
      const { error } = await supabase.from('saved_courses').insert([
        { id: courseId, theme: selectedCourse.theme, concept: currentConcept, total_budget: numericBudget }
      ])
      if (error) throw error
      setAddedCourseIds((prev) => [...prev, courseId])
      alert('코스가 클라우드 데이터베이스에 안전하게 저장되었습니다! 🎒')
    } catch (error) {
      alert('데이터베이스 연결 중 문제가 발생했습니다. 로컬 상태로만 저장됩니다.')
      setAddedCourseIds((prev) => [...prev, courseId])
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
    setUser({ email: loginForm.email, nickname })
    setLoginForm({ email: '', password: '' })
    setIsLoginOpen(false)
  }

  const handleLogout = () => {
    setUser(null)
    setAddedCourseIds([])
  }

  return (
    <main className="app">
      <header className="nav">
        <div className="brand"><span className="brand-icon">◎</span><strong>Sahara</strong></div>
        <nav className="nav-menu" aria-label="주요 메뉴">
          <a href="#travel-input">AI 코스추천</a>
          <a href="#recommendations">인플루언서 코스</a>
          <a href="#recommendations">세미패키지</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="user-menu">
              <span>{user.nickname}님</span>
              <button type="button" onClick={handleLogout}>로그아웃</button>
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
            <a href="#recommendations" className="secondary-link">인플루언서 코스 보기</a>
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
        <div><strong>{addedCourseIds.length}개</strong><span>내 일정 추가</span></div>
        <div><strong>{matchRatePercent}%</strong><span>추천 저장률</span></div>
      </section>

      <section className="recommendation-section" id="recommendations">
        <div className="section-heading">
          <h2>5초 만에 완성된 <span>3가지 맞춤 코스</span></h2>
          <p>사진과 동선을 확인하고, 원하는 대로 자유롭게 코스를 편집하세요.</p>
        </div>

        <div className="recommendation-grid">
          {visibleRecommendations.map((course, index) => {
            const isAdded = addedCourseIds.includes(course.id)
            const imageClass = ['oasis', 'food', 'activity'][index] || 'oasis'

            return (
              <article className="recommendation-card" key={course.id}>
                <div className={`course-image ${imageClass}`}>
                  {course.influencerCourse && <span className="course-badge">인플루언서 추천</span>}
                </div>

                <div className="course-content">
                  <p className="course-meta">◎ {course.estimatedTime}</p>
                  <h3>{course.theme}</h3>
                  <p>{course.description}</p>

                  {/* 🚀 여행콕콕 스타일 타임라인 레이아웃 시작 */}
                  <div className="day-preview" style={{ marginTop: '20px' }}>
                    {course.days.map((day, dIndex) => (
                      <div key={day.day} className="day-block" style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '1.2rem', color: '#0056b3', fontWeight: 'bold', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>{day.day}</h4>
                        
                        {/* 타임라인 컨테이너: 좌측에 선을 그어줍니다. */}
                        <div className="timeline-container" style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #e2e8f0', marginLeft: '8px' }}>
                          
                          {day.schedules.map((schedule, sIndex) => {
                            // 임시 썸네일용 랜덤 이미지 생성 (장소 이름을 시드로 사용하여 항상 같은 사진이 나오게 함)
                            const placeholderImage = `https://picsum.photos/seed/${encodeURIComponent(schedule.place)}/120/120`;

                            return (
                              <div key={sIndex}>
                                {/* 카드 본체 */}
                                <div className="timeline-item" style={{ 
                                  position: 'relative', display: 'flex', background: 'white', padding: '12px', 
                                  borderRadius: '12px', border: '1px solid #edf2f7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                                  marginBottom: sIndex === day.schedules.length - 1 ? '10px' : '0'
                                }}>
                                  
                                  {/* 타임라인 점(Dot) */}
                                  <div style={{ position: 'absolute', left: '-31px', top: '24px', width: '12px', height: '12px', background: '#0056b3', borderRadius: '50%', border: '2px solid #fff', zIndex: 2 }} />
                                  
                                  {/* 좌측: 썸네일 이미지 */}
                                  <img src={placeholderImage} alt={schedule.place} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', marginRight: '15px', backgroundColor: '#e2e8f0' }} />

                                  {/* 중앙: 텍스트 정보 */}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1a202c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {schedule.place}
                                    </h5>
                                    {schedule.category && <span style={{ fontSize: '0.8rem', color: '#718096' }}>{schedule.category}</span>}
                                  </div>

                                  {/* 우측: 미니멀 편집 아이콘 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', marginLeft: '10px' }}>
                                    <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'up')} disabled={sIndex === 0} style={{ padding: '4px', background: 'transparent', border: 'none', color: sIndex === 0 ? '#e2e8f0' : '#a0aec0', cursor: sIndex === 0 ? 'default' : 'pointer' }}>▲</button>
                                    <button onClick={() => deleteSchedule(course.id, dIndex, sIndex)} style={{ padding: '4px', background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '0.8' }}>×</button>
                                    <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'down')} disabled={sIndex === day.schedules.length - 1} style={{ padding: '4px', background: 'transparent', border: 'none', color: sIndex === day.schedules.length - 1 ? '#e2e8f0' : '#a0aec0', cursor: sIndex === day.schedules.length - 1 ? 'default' : 'pointer' }}>▼</button>
                                  </div>
                                </div>

                                {/* 카드와 카드 사이의 이동 수단 (마지막 항목이 아닐 때만 표시) */}
                                {sIndex < day.schedules.length - 1 && schedule.transit && (
                                  <div className="transit-indicator" style={{ position: 'relative', padding: '12px 0 12px 15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0056b3', fontSize: '0.85rem', fontWeight: '500' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🚗</span> {schedule.transit}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          
                          {/* 장소 추가 버튼 */}
                          <button onClick={() => addSchedule(course.id, dIndex)} style={{ 
                            width: '100%', padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e0', 
                            color: '#718096', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', 
                            fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s' 
                          }}
                          onMouseOver={(e) => { e.target.style.background = '#e8f0fe'; e.target.style.color = '#0056b3'; e.target.style.border = '1px dashed #a0aec0'; }}
                          onMouseOut={(e) => { e.target.style.background = '#f8fafc'; e.target.style.color = '#718096'; e.target.style.border = '1px dashed #cbd5e0'; }}
                          >
                            + 장소 추가
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {course.days.length > 0 && <CourseMap places={course.days.flatMap(day => day.schedules)} />}

                  <button
                    type="button"
                    onClick={() => handleAddCourse(course.id)}
                    disabled={isAdded}
                    className={`save-btn ${isAdded ? 'added' : ''}`}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: isAdded ? 'default' : 'pointer', backgroundColor: isAdded ? '#e2e8f0' : '#0056b3', color: isAdded ? '#a0aec0' : '#ffffff', border: 'none', marginTop: '1rem', transition: 'all 0.2s ease' }}
                  >
                    {isAdded ? '✅ 내 일정에 추가됨' : '🤍 내 일정에 저장하기'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {savedCourses.length > 0 && (
        <section className="saved-courses-section" id="my-schedule" style={{ maxWidth: '1200px', margin: '3rem auto', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#1a202c', margin: '0 0 0.5rem 0' }}>🎒 내 일정 보관함</h2>
            <p style={{ color: '#718096', margin: 0 }}>저장하신 맞춤 코스들을 확인하고 관리하세요.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {savedCourses.map(course => (
              <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #0056b3' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>{course.theme}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>
                    {course.estimatedTime} <span style={{ color: '#cbd5e0', margin: '0 8px' }}>|</span> 총 {course.days.length}일 일정
                  </p>
                </div>
                
                <button
                  onClick={() => setAddedCourseIds(prev => prev.filter(id => id !== course.id))}
                  style={{ background: '#fff0f2', color: '#e53e3e', border: '1px solid #fed7d7', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
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

      {isLoginOpen && (
        <div className="login-modal-backdrop">
          <section className="login-modal" aria-label="로그인 창">
            <button type="button" className="modal-close" onClick={() => setIsLoginOpen(false)}>×</button>
            <div className="login-modal-header">
              <span className="brand-icon">◎</span>
              <h2>Sahara 로그인</h2>
              <p>로그인하면 추천 코스를 내 일정에 저장할 수 있습니다.</p>
            </div>
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label htmlFor="email">이메일</label>
              <input id="email" name="email" type="email" value={loginForm.email} onChange={handleLoginChange} placeholder="example@email.com" />
              <label htmlFor="password">비밀번호</label>
              <input id="password" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} placeholder="비밀번호 입력" />
              <button type="submit">로그인</button>
            </form>
            <p className="login-help">MVP 시연용 로그인입니다. 실제 회원 인증은 향후 Supabase 또는 Firebase로 확장할 수 있습니다.</p>
          </section>
        </div>
      )}
    </main>
  )
}

export default MainPage