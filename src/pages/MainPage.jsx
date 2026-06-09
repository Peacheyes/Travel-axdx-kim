// src/pages/MainPage.jsx
import { useMemo, useState, useEffect } from 'react'
import TravelForm from '../components/TravelForm'
import { createRecommendations } from '../lib/recommendation'
import { calculateRecommendationMatchRate } from '../lib/kpi'
import { getSaharaRecommendation } from '../api/saharaService'
import CourseMap from '../components/CourseMap'
import { DAY_THEMES } from '../lib/dayThemes'
import {
  collectUniquePlaceNames,
  formatAiCourse,
  isAiGeneratedCourse,
} from '../lib/formatCourse'
import { getGeminiUserMessage } from '../lib/geminiErrors'
import { fetchPlaceData, prefetchPlaceCoordinates } from '../lib/placeGeocoding'
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
  const [recommendations, setRecommendations] = useState([])
  const [addedCourseIds, setAddedCourseIds] = useState(() => {
    const savedData = localStorage.getItem('sahara_saved_courses')
    return savedData ? JSON.parse(savedData) : []
  })

  useEffect(() => {
    localStorage.setItem('sahara_saved_courses', JSON.stringify(addedCourseIds))
  }, [addedCourseIds])

  const [currentConcept, setCurrentConcept] = useState(previewInput.concept)
  const [currentDestination, setCurrentDestination] = useState(previewInput.destination)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const previewRecommendations = useMemo(() => createRecommendations(previewInput), [])
  const visibleRecommendations = recommendations.length > 0 ? recommendations : previewRecommendations

  const matchRate = useMemo(() => calculateRecommendationMatchRate(addedCourseIds.length, visibleRecommendations.length), [addedCourseIds.length, visibleRecommendations.length])
  const matchRatePercent = Math.round(matchRate * 100)
  const savedCourses = visibleRecommendations.filter(course => addedCourseIds.includes(course.id))

  const moveSchedule = (courseId, dayIndex, scheduleIndex, direction) => {
    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      const newSchedules = [...day.schedules];
      if (direction === 'up' && scheduleIndex > 0) [newSchedules[scheduleIndex - 1], newSchedules[scheduleIndex]] = [newSchedules[scheduleIndex], newSchedules[scheduleIndex - 1]];
      else if (direction === 'down' && scheduleIndex < newSchedules.length - 1) [newSchedules[scheduleIndex], newSchedules[scheduleIndex + 1]] = [newSchedules[scheduleIndex + 1], newSchedules[scheduleIndex]];
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

  const addSchedule = async (courseId, dayIndex) => {
    const newPlaceName = window.prompt("추가할 장소 이름을 입력하세요:");
    if (!newPlaceName || newPlaceName.trim() === '') return;

    const apiData = await fetchPlaceData(newPlaceName.trim(), currentDestination);

    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      day.schedules = [...day.schedules, { 
        place: newPlaceName, 
        category: '⭐ 직접 추가', 
        transit: '', 
        cost: 0,
        tourApiImg: apiData.img,
        mapx: apiData.mapx, // 가져온 좌표 저장
        mapy: apiData.mapy  // 가져온 좌표 저장
      }];
      newDays[dayIndex] = day;
      return { ...course, days: newDays };
    }));
  };

  const handleGenerate = async (input) => {
    if (isLoading) return

    setIsLoading(true)
    setErrorMessage('')
    setCurrentConcept(input.concept || '일반')
    setCurrentDestination(input.destination || '')

    try {
      const scheduleText = `${input.startDate} 부터 ${input.endDate} 까지`
      const aiData = await getSaharaRecommendation(input.destination, scheduleText, input.companion, input.concept)
      const uniquePlaceNames = collectUniquePlaceNames(aiData)

      await prefetchPlaceCoordinates(uniquePlaceNames, input.destination)

      const formattedResults = await Promise.all(
        aiData.map((item, index) => formatAiCourse(item, index, input.destination)),
      )

      setRecommendations(formattedResults)
      setAddedCourseIds([])
      document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      console.error('AI 생성 에러:', error)
      setErrorMessage(getGeminiUserMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCourse = async (courseId) => {
    if (!user) { setIsLoginOpen(true); return; }

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
            <div className="user-menu"><span>{user.nickname}님</span><button type="button" onClick={handleLogout}>로그아웃</button></div>
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
        <div><strong>{visibleRecommendations.length}개</strong><span>추천 코스</span></div>
        <div><strong>{addedCourseIds.length}개</strong><span>내 일정 추가</span></div>
        <div><strong>{matchRatePercent}%</strong><span>추천 저장률</span></div>
      </section>

      <section className="recommendation-section" id="recommendations">
        <div className="section-heading">
          <h2>5초 만에 완성된 <span>3가지 맞춤 코스</span></h2>
          <p>입력하신 조건과 취향을 바탕으로 일정표, 주요 장소, 추천 이유를 비교해보세요.</p>
        </div>

        <div className="recommendation-grid">
          {visibleRecommendations.map((course, index) => {
            const isAdded = addedCourseIds.includes(course.id)
            const isAiCourse = isAiGeneratedCourse(course.id)
            const imageClass = ['oasis', 'food', 'activity'][index] || 'oasis'
            
            const repImage = course.headerImg || `https://picsum.photos/seed/${encodeURIComponent(course.theme)}/800/400`;

            return (
              <article className="recommendation-card" key={course.id} style={{ textAlign: 'left' }}>
                <div className={`course-image ${imageClass}`} style={{ position: 'relative', height: '220px', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                  <img src={repImage} alt="테마 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {course.influencerCourse && <span className="course-badge" style={{ position: 'absolute', top: '15px', left: '15px', background: '#e53e3e', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>인플루언서 추천</span>}
                </div>

                <div className="course-content" style={{ padding: '24px', textAlign: 'left' }}>
                  <p className="course-meta" style={{ textAlign: 'left' }}>◎ {course.estimatedTime}</p>
                  <h3 style={{ textAlign: 'left' }}>{course.theme}</h3>
                  <p style={{ textAlign: 'left' }}>{course.description}</p>

                  <div className="day-preview" style={{ marginTop: '24px', textAlign: 'left' }}>
                    {course.days.map((day, dIndex) => {
                      const theme = DAY_THEMES[dIndex % DAY_THEMES.length];

                      return (
                        <div key={day.day} className="day-block" style={{ marginBottom: '32px', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '1.3rem', color: theme.main, fontWeight: 'bold', marginBottom: '16px', borderBottom: `2px solid ${theme.bg}`, paddingBottom: '8px', textAlign: 'left', clear: 'both' }}>
                            {day.day}
                          </h4>
                          
                          <div style={{ position: 'relative', paddingLeft: '24px', marginLeft: '12px', borderLeft: `2px solid ${theme.bg}`, textAlign: 'left', display: 'block' }}>
                            {day.schedules.map((schedule, sIndex) => {
                              const finalImageSrc = schedule.tourApiImg || `https://picsum.photos/seed/${encodeURIComponent(schedule.place)}/120/120`;

                              return (
                                <div key={sIndex} style={{ display: 'block', textAlign: 'left', marginBottom: '0' }}>
                                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '16px 0', borderBottom: '1px dashed #edf2f7', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
                                    
                                    <div style={{ position: 'absolute', left: '-31px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', background: theme.main, borderRadius: '50%', border: '2px solid #fff', zIndex: 2 }} />
                                    
                                    <div style={{ position: 'relative', marginRight: '16px', flexShrink: 0, alignSelf: 'center' }}>
                                      <img src={finalImageSrc} alt={schedule.place} style={{ width: '64px', height: '64px', minWidth: '64px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                                      <div style={{ position: 'absolute', top: '-6px', left: '-6px', width: '22px', height: '22px', background: theme.main, color: 'white', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 3 }}>
                                        {sIndex + 1}
                                      </div>
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left', paddingRight: '10px', justifyContent: 'center' }}>
                                      <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#1a202c', fontWeight: 'bold', textAlign: 'left', wordBreak: 'keep-all', overflowWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }}>
                                        {schedule.place}
                                      </h5>
                                      <span style={{ fontSize: '0.8rem', color: '#718096', textAlign: 'left', display: 'block', marginBottom: '6px' }}>{schedule.category || '관광'}</span>
                                      
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        {schedule.cost > 0 && <span style={{ background: '#fefcbf', color: '#c05621', padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>💰 {schedule.cost.toLocaleString()}원</span>}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto', flexShrink: 0, alignSelf: 'center', minWidth: '70px' }}>
                                      <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', justifyContent: 'center' }}>
                                        <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'up')} disabled={!isAiCourse || sIndex === 0} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: !isAiCourse || sIndex === 0 ? '#cbd5e0' : '#4a5568', cursor: !isAiCourse || sIndex === 0 ? 'default' : 'pointer', fontSize: '0.8rem', margin: 0, float: 'none' }}>▲</button>
                                        <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'down')} disabled={!isAiCourse || sIndex === day.schedules.length - 1} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: !isAiCourse || sIndex === day.schedules.length - 1 ? '#cbd5e0' : '#4a5568', cursor: !isAiCourse || sIndex === day.schedules.length - 1 ? 'default' : 'pointer', fontSize: '0.8rem', margin: 0, float: 'none' }}>▼</button>
                                      </div>
                                      <button onClick={() => deleteSchedule(course.id, dIndex, sIndex)} disabled={!isAiCourse} style={{ padding: '6px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '6px', cursor: !isAiCourse ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', margin: 0, float: 'none', opacity: !isAiCourse ? 0.5 : 1 }}>삭제</button>
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
                            
                            <button onClick={() => addSchedule(course.id, dIndex)} disabled={!isAiCourse} style={{ 
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

                  {isAiCourse ? (
                    <CourseMap
                      days={course.days}
                      dayThemes={DAY_THEMES}
                    />
                  ) : (
                    <div style={{ height: '120px', width: '100%', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', color: '#718096', fontWeight: '600', border: '1px dashed #cbd5e0' }}>
                      맞춤 코스 생성 후 지도 동선이 표시됩니다.
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
        <div className="login-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <section className="login-modal" aria-label="로그인 창" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', position: 'relative', zIndex: 10000, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <button type="button" onClick={() => setIsLoginOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
            <div className="login-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <span className="brand-icon" style={{ fontSize: '2.5rem', color: '#0056b3' }}>◎</span>
              <h2 style={{ margin: '10px 0 5px 0', color: '#1a202c' }}>Sahara 로그인</h2>
            </div>
            <form className="login-form" onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input name="email" type="email" value={loginForm.email} onChange={handleLoginChange} placeholder="이메일 입력" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <input name="password" type="password" value={loginForm.password} onChange={handleLoginChange} placeholder="비밀번호 입력" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <button type="submit" style={{ padding: '14px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>로그인</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default MainPage