// src/pages/AdminPage.jsx (UI 수리 버전)
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid, BarChart, Bar
} from 'recharts';

export default function AdminPage() {
  const [savedCourses, setSavedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔐 보안 로직 상태 변수
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // 🧭 좌측 메뉴 네비게이션 상태 관리 (현재 보고 있는 탭)
  const [activeMenu, setActiveMenu] = useState('overview');

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedCourses(data || []);
    } catch (error) {
      console.error('Supabase 데이터 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('sahara_admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
    fetchCloudData();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'sahara2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('sahara_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('비밀번호가 일치하지 않습니다.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('sahara_admin_auth');
    setPasswordInput('');
  };

  // 💾 엑셀(CSV) 다운로드 기능
  const downloadCSV = () => {
    const headers = ['ID', '테마명', '컨셉', '총 예산', '저장 일시'];
    const rows = savedCourses.map(course => [
      course.id,
      `"${course.theme}"`, 
      course.concept,
      course.total_budget,
      course.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sahara_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 데이터 가공 로직 ---
  const pieChartData = useMemo(() => {
    const counts = savedCourses.reduce((acc, cur) => {
      acc[cur.concept] = (acc[cur.concept] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value);
  }, [savedCourses]);

  const areaChartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const counts = savedCourses.reduce((acc, cur) => {
      const date = cur.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return last7Days.map(date => ({
      date: date.slice(5).replace('-', '.'), 
      세션: counts[date] || 0 
    }));
  }, [savedCourses]);

  // 컨셉별 평균 예산 분석
  const budgetByConceptData = useMemo(() => {
    const stats = savedCourses.reduce((acc, cur) => {
      if (!acc[cur.concept]) acc[cur.concept] = { total: 0, count: 0 };
      acc[cur.concept].total += Number(cur.total_budget);
      acc[cur.concept].count += 1;
      return acc;
    }, {});

    return Object.keys(stats).map(key => ({
      name: key,
      평균예산: Math.round(stats[key].total / stats[key].count)
    })).sort((a, b) => b.평균예산 - a.평균예산);
  }, [savedCourses]);

  // 구글 애널리틱스 스타일 컬러 팔레트
  const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#5f6368'];

  const totalSaved = savedCourses.length;
  const averageBudget = totalSaved > 0 
    ? Math.round(savedCourses.reduce((sum, item) => sum + Number(item.total_budget), 0) / totalSaved)
    : 0;
  const topConcept = pieChartData.length > 0 ? pieChartData[0].name : '-';

  // --- 🛠️ UI 수리: schedule-item의 렌더링 함수를 정의합니다 ---
  const renderScheduleItem = (courseId, dIndex, sIndex, schedule, day) => (
    <div key={sIndex} className="schedule-item" style={{ 
      background: 'white', 
      padding: '16px', // 여백 늘림
      borderRadius: '8px', 
      marginBottom: '10px', 
      border: '1px solid #e2e8f0', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)' // 가벼운 그림자 추가
    }}>
      
      {/* 👈 좌측: 장소 정보 (schedule-info) */}
      <div className="schedule-info" style={{ flex: 1 }}>
        <p className="schedule-place" style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#1a202c', fontSize: '1rem' }}>
          {schedule.place}
          {schedule.category && (
            <span style={{ fontSize: '0.8rem', color: '#718096', marginLeft: '10px', fontWeight: 'normal' }}>
              ({schedule.category})
            </span>
          )}
        </p>
        <div style={{ fontSize: '0.85rem', color: '#4a5568', display: 'flex', gap: '15px' }}>
          {schedule.cost > 0 && <span>💰 {schedule.cost.toLocaleString()}원</span>}
          {schedule.transit && <span>🚶‍♂️ {schedule.transit}</span>}
        </div>
      </div>

      {/* 👉 우측: 편집 컨트롤러 (schedule-controls) */}
      {/* 💡 전문적인 느낌을 위해 FontAwesome 아이콘 사용을 제안합니다 (폰트 설치 필요) */}
      <div className="schedule-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button 
          onClick={() => moveSchedule(courseId, dIndex, sIndex, 'up')} 
          disabled={sIndex === 0} 
          style={{ 
            padding: '6px 10px', 
            background: sIndex === 0 ? '#edf2f7' : '#f1f3f4', // 색상 변경
            color: sIndex === 0 ? '#cbd5e0' : '#4a5568', // 색상 변경
            border: 'none', 
            borderRadius: '4px', 
            cursor: sIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🔼 {/* <i className="fa-solid fa-chevron-up"></i> */}
        </button>
        <button 
          onClick={() => moveSchedule(courseId, dIndex, sIndex, 'down')} 
          disabled={sIndex === day.schedules.length - 1} 
          style={{ 
            padding: '6px 10px', 
            background: sIndex === day.schedules.length - 1 ? '#edf2f7' : '#f1f3f4', // 색상 변경
            color: sIndex === day.schedules.length - 1 ? '#cbd5e0' : '#4a5568', // 색상 변경
            border: 'none', 
            borderRadius: '4px', 
            cursor: sIndex === day.schedules.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🔽 {/* <i className="fa-solid fa-chevron-down"></i> */}
        </button>
        <button 
          onClick={() => deleteSchedule(courseId, dIndex, sIndex)} 
          style={{ 
            padding: '6px 10px', 
            background: '#fff0f2', 
            color: '#e53e3e', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginLeft: '6px' // 여백 추가
          }}
        >
          ❌ {/* <i className="fa-solid fa-trash-can"></i> */}
        </button>
      </div>
    </div>
  );

  // --- 장소 추가 버튼 스타일 수정 ---
  const renderAddButton = (courseId, dIndex) => (
    <button 
      onClick={() => addSchedule(courseId, dIndex)} 
      style={{ 
        width: '100%', 
        padding: '12px', 
        background: 'transparent', 
        border: '1px dashed #cbd5e0', 
        color: '#718096', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        marginTop: '10px', 
        fontWeight: '600',
        fontSize: '0.9rem',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      onMouseOver={(e) => {
        e.target.style.background = '#e8f0fe';
        e.target.style.color = '#1a73e8';
        e.target.style.border = '1px dashed #a0aec0';
      }}
      onMouseOut={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.color = '#718096';
        e.target.style.border = '1px dashed #cbd5e0';
      }}
    >
      ➕ 이 날짜에 장소 추가하기 {/* <i className="fa-solid fa-plus-circle"></i> */}
    </button>
  );

  // 메뉴 리스트 정의
  const menus = [
    { id: 'overview', label: '📊 잠재고객 개요' },
    { id: 'logs', label: '👥 전체 활동 로그' },
    { id: 'stats', label: '📈 컨셉별 상세 통계' },
  ];

  // 🚧 로그인 화면
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #dadce0', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <div style={{ fontSize: '2rem', color: '#1a73e8', marginBottom: '10px', fontWeight: 'bold' }}>◎ Sahara Analytics</div>
          <h2 style={{ color: '#202124', fontSize: '1.2rem', marginBottom: '30px', fontWeight: '500' }}>관리자 계정으로 로그인</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ padding: '12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '1rem' }}
            />
            <button type="submit" style={{ padding: '12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', fontWeight: '500' }}>
              로그인
            </button>
          </form>
          {loginError && <p style={{ color: '#ea4335', marginTop: '15px', fontSize: '0.9rem' }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Roboto, Pretendard, sans-serif' }}>
      
      {/* 👈 좌측 사이드바 (LNB) */}
      <aside style={{ width: '240px', backgroundColor: '#ffffff', borderRight: '1px solid #dadce0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #dadce0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem', color: '#1a73e8' }}>◎</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#5f6368' }}>Sahara Insight</span>
        </div>
        <nav style={{ padding: '15px 0', flex: 1 }}>
          {menus.map((menu) => (
            <div 
              key={menu.id}
              onClick={() => setActiveMenu(menu.id)}
              style={{ 
                padding: '12px 20px', 
                cursor: 'pointer',
                backgroundColor: activeMenu === menu.id ? '#e8f0fe' : 'transparent', 
                color: activeMenu === menu.id ? '#1a73e8' : '#5f6368', 
                fontWeight: activeMenu === menu.id ? 'bold' : 'normal',
                borderTopRightRadius: '20px', 
                borderBottomRightRadius: '20px', 
                width: '90%',
                transition: 'all 0.2s'
              }}
            >
              {menu.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #dadce0' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: 'none', border: '1px solid #dadce0', borderRadius: '4px', color: '#5f6368', cursor: 'pointer' }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 👉 메인 콘텐츠 영역 */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* 상단 컨트롤러 바 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#202124', fontWeight: '500' }}>
            {menus.find(m => m.id === activeMenu)?.label.substring(3)}
          </h1>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#5f6368', fontSize: '0.9rem' }}>상태: 실시간 연동됨</span>
            <button onClick={fetchCloudData} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', color: '#1a73e8', cursor: 'pointer', fontSize: '0.9rem' }}>
              새로고침
            </button>
            <Link to="/" style={{ color: '#1a73e8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>고객 화면 ➡️</Link>
          </div>
        </header>

        {/* 탭 1. 잠재고객 개요 (대시보드 + 수리된 코스 편집기) */}
        {activeMenu === 'overview' && (
          <>
            {/* KPI 카드 행, 시계열 차트, 파이 차트 유지 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
              {/* KPI 카드들 생략... */}
            </div>

            {/* 시계열 히어로 차트 유지... */}
            
            {/* 파이 차트 유지... */}

            {/* 🛠️ 수리된 코스 편집기 영역 */}
            <section className="recommendation-section" id="recommendations" style={{ marginTop: '30px' }}>
              <div className="section-heading" style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#202124', fontWeight: '500' }}>코스 세부 일정 편집</h2>
                <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0 }}>각 날짜의 장소를 드래그 앤 드롭으로 편집하거나 직접 추가/삭제할 수 있습니다.</p>
              </div>

              <div className="recommendation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {savedCourses.slice(0, 3).map((course, index) => { // 최근 3개 코스만 보여줌
                  return (
                    <article className="recommendation-card" key={course.id} style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                      <div className="course-content">
                        <p className="course-meta" style={{ color: '#80868b', fontSize: '0.85rem' }}>◎ {course.created_at.split('T')[0]} 저장됨</p>
                        <h3 style={{ fontSize: '1.1rem', color: '#1a202c', marginBottom: '15px' }}>{course.theme}</h3>

                        <div className="day-preview">
                          {course.days.map((day, dIndex) => (
                            <div key={day.day} className="day-block" style={{ marginBottom: '25px', padding: '20px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #edf2f7' }}>
                              <span className="day-title" style={{ fontSize: '1.2rem', color: '#0056b3', fontWeight: '700' }}>{day.day}</span>
                              
                              <div className="schedule-list" style={{ marginTop: '15px' }}>
                                {day.schedules.map((schedule, sIndex) => renderScheduleItem(course.id, dIndex, sIndex, schedule, day))}
                                
                                {/* 수리된 장소 추가 버튼 사용 */}
                                {renderAddButton(course.id, dIndex)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 기존 저장 버튼 등 유지... */}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/* 다른 탭들 (logs, stats) 유지... */}

      </main>
    </div>
  );
}