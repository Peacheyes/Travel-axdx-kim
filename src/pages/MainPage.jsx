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
  // 💡 프리뷰 데이터를 아예 초기 상태로 넣어서 처음부터 편집이 가능하게 만듭니다.
  const [recommendations, setRecommendations] = useState(() => createRecommendations(previewInput))
  
  const [addedCourseIds, setAddedCourseIds] = useState(() => {
    const savedData = localStorage.getItem('sahara_saved_courses')
    return savedData ? JSON.parse(savedData) : []
  })

  const [currentConcept, setCurrentConcept] = useState(previewInput.concept)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  useEffect(() => {
    localStorage.setItem('sahara_saved_courses', JSON.stringify(addedCourseIds))
  }, [addedCourseIds])

  const matchRate = useMemo(() => {
    return calculateRecommendationMatchRate(addedCourseIds.length, recommendations.length)
  }, [addedCourseIds.length, recommendations.length])

  const matchRatePercent = Math.round(matchRate * 100)
  const savedCourses = recommendations.filter(course => addedCourseIds.includes(course.id))

  // --- 🛠️ 1. 일정 순서 위/아래 이동 함수 ---
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

  // --- 🛠️ 2. 일정 삭제 함수 ---
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

  // --- 🛠️ 3. 새 장소 추가 함수 ---
  const addSchedule = (courseId, dayIndex) => {
    const newPlaceName = window.prompt("추가할 장소 이름을 입력하세요:");
    if (!newPlaceName || newPlaceName.trim() === '') return;

    setRecommendations(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      const newDays = [...course.days];
      const day = { ...newDays[dayIndex] };
      day.schedules = [...day.schedules, {
        place: newPlaceName,
        category: '⭐ 직접 추가',
        transit: '',
        cost: 0
      }];
      newDays[dayIndex] = day;
      return { ...course, days: newDays };
    }));
  };

  // AI 코스 생성
  const handleGenerate = async (input) => {
    setIsLoading(true)
    setErrorMessage('')
    setCurrentConcept(input.concept || '일반')

    try {
      const scheduleText = `${input.startDate} 부터 ${input.endDate} 까지`
      const aiData = await getSaharaRecommendation(input.destination, scheduleText, input.companion, input.concept)
      
      const formattedResults = aiData.map((item, index) => {
        const safeBudget = Number(item.totalBudget) || 0; 
        const uniqueId = `ai-course-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;

        return {
          id: uniqueId,
          influencerCourse: false,
          estimatedTime: `예상 총 경비: ${safeBudget.toLocaleString()}원`,
          theme: item.themeName || '맞춤 테마',
          description: item.themeDescription || '',
          days: (item.itinerary || []).map((dayPlan) => ({
            day: `Day ${dayPlan.day}`,
            schedules: (dayPlan.places || []).map((place) => ({
              place: place.placeName || '장소명 없음',
              category: place.category || '',
              transit: place.transitInfo || '',
              cost: Number(place.estimatedCost) || 0
            }))
          }))
        }
      })

      setRecommendations(formattedResults)
      setAddedCourseIds([]) 
    } catch (error) {
      console.error("AI 생성 에러:", error)
      setErrorMessage('코스 최적화 중 문제가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 코스 저장 (DB INSERT)
  const handleAddCourse = async (courseId) => {
    if (!user) { setIsLoginOpen(true); return; }
    if (addedCourseIds.includes(courseId)) return;

    const selectedCourse = recommendations.find(c => c.id === courseId)
    if (!selectedCourse) return

    const budgetString = selectedCourse.estimatedTime.replace(/[^0-9]/g, '')
    const numericBudget = Number(budgetString) || 0

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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password.trim()) return;
    setUser({ email: loginForm.email, nickname: loginForm.email.split('@')[0] });
    setLoginForm({ email: '', password: '' });
    setIsLoginOpen(false);
  }

  return (
    <main className="app">
      <header className="nav">
        <div className="brand"><span className="brand-icon">◎</span><strong>Sahara</strong></div>
        <nav className="nav-menu">
          <a href="#travel-input">AI 코스추천</a>
          <a href="#recommendations">인플루언서 코스</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="user-menu"><span>{user.nickname}님</span><button type="button" onClick={() => {setUser(null); setAddedCourseIds([]);}}>로그아웃</button></div>
          ) : (
            <button type="button" className="login-button" onClick={() => setIsLoginOpen(true)}>로그인</button>
          )}
        </div>
      </header>

      {/* Hero & Form 생략 없이 기존 유지 */}
      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">AI 기반 초개인화 큐레이션</p>
          <h1>정보의 사막에서<br/><span>나만의 여행 루트를 찾다</span></h1>
        </div>
      </section>

      <section className="search-card" id="travel-input">
        <TravelForm onGenerate={handleGenerate} isLoading={isLoading} />
        {errorMessage && <p className="form-errors" role="alert">{errorMessage}</p>}
      </section>

      <section className="recommendation-section" id="recommendations">
        <div className="section-heading">
          <h2>5초 만에 완성된 <span>3가지 맞춤 코스</span></h2>
          <p>마음에 들지 않는 일정은 직접 수정하고 추가해 보세요!</p>
        </div>

        <div className="recommendation-grid">
          {recommendations.map((course, index) => {
            const isAdded = addedCourseIds.includes(course.id)
            const imageClass = ['oasis', 'food', 'activity'][index] || 'oasis'

            return (
              <article className="recommendation-card" key={course.id}>
                <div className={`course-image ${imageClass}`}></div>
                <div className="course-content">
                  <p className="course-meta">◎ {course.estimatedTime}</p>
                  <h3>{course.theme}</h3>
                  <p>{course.description}</p>

                  <div className="day-preview">
                    {course.days.map((day, dIndex) => (
                      <div key={day.day} className="day-block" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <span className="day-title" style={{ fontSize: '1.1rem', color: '#0056b3', fontWeight: 'bold' }}>{day.day}</span>
                        
                        <div className="schedule-list" style={{ marginTop: '10px' }}>
                          {day.schedules.map((schedule, sIndex) => (
                            // 💡 레이아웃 깨짐을 방지하는 핵심 수정 영역
                            <div key={sIndex} className="schedule-item" style={{ 
                              background: 'white', padding: '14px 16px', borderRadius: '8px', marginBottom: '10px', 
                              border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', 
                              alignItems: 'center', gap: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' 
                            }}>
                              
                              {/* 좌측: 장소 정보 (유연하게 줄어들도록 flex: 1, minWidth: 0 설정) */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="schedule-place" style={{ 
                                  margin: '0 0 6px 0', fontWeight: '600', color: '#1a202c', fontSize: '0.95rem',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' // 글씨가 길면 ... 으로 자르기
                                }}>
                                  {schedule.place}
                                  {schedule.category && <span style={{ fontSize: '0.8rem', color: '#718096', marginLeft: '6px', fontWeight: 'normal' }}>({schedule.category})</span>}
                                </p>
                                <div style={{ fontSize: '0.8rem', color: '#4a5568', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  {schedule.cost > 0 && <span>💰 {schedule.cost.toLocaleString()}원</span>}
                                  {schedule.transit && <span>🚶‍♂️ {schedule.transit}</span>}
                                </div>
                              </div>

                              {/* 우측: 편집 컨트롤러 (절대 줄어들지 않도록 flexShrink: 0 설정) */}
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'up')} disabled={sIndex === 0} style={{ padding: '6px 8px', background: sIndex === 0 ? '#f7fafc' : '#edf2f7', color: sIndex === 0 ? '#cbd5e0' : '#4a5568', border: 'none', borderRadius: '4px', cursor: sIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>🔼</button>
                                <button onClick={() => moveSchedule(course.id, dIndex, sIndex, 'down')} disabled={sIndex === day.schedules.length - 1} style={{ padding: '6px 8px', background: sIndex === day.schedules.length - 1 ? '#f7fafc' : '#edf2f7', color: sIndex === day.schedules.length - 1 ? '#cbd5e0' : '#4a5568', border: 'none', borderRadius: '4px', cursor: sIndex === day.schedules.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>🔽</button>
                                <button onClick={() => deleteSchedule(course.id, dIndex, sIndex)} style={{ padding: '6px 8px', background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '2px' }}>❌</button>
                              </div>
                            </div>
                          ))}
                          
                          {/* 장소 추가 버튼 UI 개선 */}
                          <button onClick={() => addSchedule(course.id, dIndex)} style={{ 
                            width: '100%', padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e0', 
                            color: '#718096', borderRadius: '8px', cursor: 'pointer', marginTop: '8px', 
                            fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                          }}>
                            ➕ 이 날짜에 장소 추가하기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {course.days && course.days.length > 0 && (
                    <CourseMap places={course.days.flatMap(day => day.schedules)} />
                  )}

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

      {/* 로그인 모달 */}
      {isLoginOpen && (
        <div className="login-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <section className="login-modal" aria-label="로그인 창" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', position: 'relative', zIndex: 10000, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <button type="button" onClick={() => setIsLoginOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
            <div className="login-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <span className="brand-icon" style={{ fontSize: '2.5rem', color: '#0056b3' }}>◎</span>
              <h2 style={{ margin: '10px 0 5px 0', color: '#1a202c' }}>Sahara 로그인</h2>
            </div>
            <form className="login-form" onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input name="email" type="email" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} placeholder="이메일 입력" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <input name="password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} placeholder="비밀번호" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              <button type="submit" style={{ padding: '14px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>로그인</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default MainPage