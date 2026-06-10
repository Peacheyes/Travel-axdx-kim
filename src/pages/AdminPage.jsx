// src/pages/AdminPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid, BarChart, Bar, LabelList
} from 'recharts';

export default function AdminPage() {
  const [savedCourses, setSavedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🌟 [추가] DB에서 가져온 진짜 회원 목록
  const [registeredUsers, setRegisteredUsers] = useState([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeMenu, setActiveMenu] = useState('overview');

  // 🌟 커스텀 모달 상태 관리 (actionType 추가하여 코스삭제/유저삭제 구분)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'alert'
    title: '',
    message: '',
    targetId: null,
    actionType: null 
  });

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      // 1. 코스 데이터
      const { data: courses, error: courseError } = await supabase
        .from('saved_courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (courseError) throw courseError;
      setSavedCourses(courses || []);

      // 🌟 2. 회원 데이터 (인구통계 포함)
      const { data: users, error: userError } = await supabase
        .from('sahara_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (userError) throw userError;
      setRegisteredUsers(users || []);

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

  const triggerDeleteCourse = (id) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: '데이터 삭제 확인',
      message: '정말로 이 데이터를 삭제하시겠습니까?\n(실제 데이터베이스에서도 영구 삭제됩니다)',
      targetId: id,
      actionType: 'course'
    });
  };

  // 🌟 [추가] 유저 강제 탈퇴 모달 트리거
  const triggerDeleteUser = (email) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: '이용자 강제 탈퇴',
      message: `[${email}] 유저를 강제 탈퇴 처리하시겠습니까?\n이용자의 모든 접근 권한이 즉시 소멸됩니다.`,
      targetId: email,
      actionType: 'user'
    });
  };

  // 🌟 [추가] 유저 프리미엄 등급 토글 로직
  const togglePremiumStatus = async (userObj) => {
    try {
      const newStatus = !userObj.is_premium;
      await supabase.from('sahara_users').update({ is_premium: newStatus }).eq('email', userObj.email);
      setRegisteredUsers(prev => prev.map(u => u.email === userObj.email ? { ...u, is_premium: newStatus } : u));
    } catch(err) { 
      console.error(err) 
    }
  };

  // 🌟 모달에서 [확인]을 눌렀을 때 실행되는 실제 삭제 로직 통합
  const executeAction = async () => {
    const id = modalConfig.targetId;
    
    if (modalConfig.actionType === 'course') {
      try {
        const { error } = await supabase.from('saved_courses').delete().eq('id', id);
        if (error) throw error;

        setSavedCourses(prev => prev.filter(course => course.id !== id));
        setModalConfig({
          isOpen: true, type: 'alert', title: '삭제 완료', message: '성공적으로 삭제되었습니다. 🗑️', targetId: null, actionType: null
        });
      } catch (error) {
        setModalConfig({
          isOpen: true, type: 'alert', title: '오류 발생', message: '데이터 삭제 중 오류가 발생했습니다.', targetId: null, actionType: null
        });
      }
    } else if (modalConfig.actionType === 'user') {
      try {
        const { error } = await supabase.from('sahara_users').delete().eq('email', id);
        if (error) throw error;

        setRegisteredUsers(prev => prev.filter(u => u.email !== id));
        setModalConfig({
          isOpen: true, type: 'alert', title: '탈퇴 처리 완료', message: '이용자가 성공적으로 시스템에서 추방되었습니다.', targetId: null, actionType: null
        });
      } catch(err) {
        setModalConfig({
          isOpen: true, type: 'alert', title: '오류 발생', message: '유저 삭제 중 오류가 발생했습니다.', targetId: null, actionType: null
        });
      }
    }
  };

  const downloadCSV = () => {
    const headers = ['ID', '테마명', '컨셉', '총 예산', '저장 일시'];
    const rows = savedCourses.map(course => [
      course.id, `"${course.theme}"`, course.concept, course.total_budget, course.created_at
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

  // --- 기존 데이터 가공 ---
  const pieChartData = useMemo(() => {
    const counts = savedCourses.reduce((acc, cur) => {
      const concept = cur.concept ? cur.concept.trim() : '미지정';
      acc[concept] = (acc[concept] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value);
  }, [savedCourses]);

  const areaChartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
    }).reverse();
    const counts = savedCourses.reduce((acc, cur) => {
      if(!cur.created_at) return acc;
      const date = cur.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1; return acc;
    }, {});
    return last7Days.map(date => ({ date: date.slice(5).replace('-', '.'), 세션: counts[date] || 0 }));
  }, [savedCourses]);

  const budgetByConceptData = useMemo(() => {
    const stats = savedCourses.reduce((acc, cur) => {
      const concept = cur.concept ? cur.concept.trim() : '미지정';
      if (!acc[concept]) acc[concept] = { total: 0, count: 0 };
      acc[concept].total += Number(cur.total_budget || 0); acc[concept].count += 1; return acc;
    }, {});
    return Object.keys(stats).map(key => ({
      name: key, 평균예산: stats[key].count > 0 ? Math.round(stats[key].total / stats[key].count) : 0
    })).sort((a, b) => b.평균예산 - a.평균예산);
  }, [savedCourses]);

  // 🌟 [추가] 인구통계학적 데이터 가공
  const ageData = useMemo(() => {
    const counts = registeredUsers.reduce((acc, cur) => { const age = cur.age || '미지정'; acc[age] = (acc[age] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, 인원: counts[key] })).sort((a, b) => a.name.localeCompare(b.name));
  }, [registeredUsers]);

  const genderData = useMemo(() => {
    const counts = registeredUsers.reduce((acc, cur) => { const gender = cur.gender || '미지정'; acc[gender] = (acc[gender] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [registeredUsers]);

  const regionData = useMemo(() => {
    const counts = registeredUsers.reduce((acc, cur) => { const region = cur.region || '미지정'; acc[region] = (acc[region] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, 인원: counts[key] })).sort((a, b) => b.인원 - a.인원);
  }, [registeredUsers]);

  const jobData = useMemo(() => {
    const counts = registeredUsers.reduce((acc, cur) => { const job = cur.job || '미지정'; acc[job] = (acc[job] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, 인원: counts[key] })).sort((a, b) => b.인원 - a.인원);
  }, [registeredUsers]);

  const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#5f6368'];
  const GENDER_COLORS = ['#f43f5e', '#3182ce', '#cbd5e0'];

  const totalSaved = savedCourses.length;
  const averageBudget = totalSaved > 0 ? Math.round(savedCourses.reduce((sum, item) => sum + Number(item.total_budget || 0), 0) / totalSaved) : 0;
  const topConcept = pieChartData.length > 0 ? pieChartData[0].name : '-';

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #dadce0', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <div style={{ fontSize: '2rem', color: '#1a73e8', marginBottom: '10px', fontWeight: 'bold' }}>◎ Sahara Analytics</div>
          <h2 style={{ color: '#202124', fontSize: '1.2rem', marginBottom: '30px', fontWeight: '500' }}>관리자 계정으로 로그인</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input type="password" placeholder="비밀번호를 입력하세요" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ padding: '12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: '12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', fontWeight: '500' }}>로그인</button>
          </form>
          {loginError && <p style={{ color: '#ea4335', marginTop: '15px', fontSize: '0.9rem' }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  // 🌟 [수정] 4번째 메뉴 탭 이름 변경
  const menus = [
    { id: 'overview', label: '📊 잠재고객 개요' },
    { id: 'logs', label: '👥 전체 활동 로그' },
    { id: 'stats', label: '📈 컨셉별 상세 통계' },
    { id: 'users', label: '🧑‍🤝‍🧑 인구통계 및 유저관리' },
  ];

  const formatKoreanCurrency = (val) => {
    if (val >= 10000) return `₩${Math.floor(val / 10000).toLocaleString()}만`;
    return `₩${val.toLocaleString()}`;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Roboto, Pretendard, sans-serif', position: 'relative' }}>
      
      {/* 커스텀 시스템 UI 모달창 렌더링 */}
      {modalConfig.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>
              {modalConfig.type === 'confirm' ? '⚠️' : '✅'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: '#202124', fontSize: '1.4rem' }}>{modalConfig.title}</h3>
            <p style={{ color: '#5f6368', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
              {modalConfig.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {modalConfig.type === 'confirm' && (
                <button 
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#f1f3f4', color: '#5f6368', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#e8eaed'}
                  onMouseOut={(e) => e.target.style.background = '#f1f3f4'}
                >
                  취소
                </button>
              )}
              <button
                onClick={() => {
                  if (modalConfig.type === 'confirm') executeAction();
                  else setModalConfig({ ...modalConfig, isOpen: false });
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: modalConfig.type === 'confirm' ? '#ea4335' : '#1a73e8', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                {modalConfig.type === 'confirm' ? '확인 및 실행' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
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

        {activeMenu === 'overview' && (
          <>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1a73e8' }}></div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>세션 (누적 저장 추이)</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSession" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#80868b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #dadce0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="세션" stroke="#1a73e8" strokeWidth={3} fillOpacity={1} fill="url(#colorSession)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px' }}>세션 (총 저장)</div>
                <div style={{ fontSize: '1.8rem', color: '#202124' }}>{isLoading ? '-' : totalSaved}</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px' }}>사용자 1인당 평균 예산</div>
                <div style={{ fontSize: '1.8rem', color: '#202124' }}>{isLoading ? '-' : `₩${averageBudget.toLocaleString()}`}</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px' }}>인기 1위 컨셉</div>
                <div style={{ fontSize: '1.8rem', color: '#202124' }}>{isLoading ? '-' : topConcept}</div>
              </div>
              {/* 🌟 가입자 수 렌더링 유지 */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px' }}>전체 가입자 수</div>
                <div style={{ fontSize: '1.8rem', color: '#1a73e8', fontWeight: 'bold' }}>{registeredUsers.length}명</div>
              </div>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>사용자 의도 분포 (컨셉)</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={2} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}
                    >
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#5f6368' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeMenu === 'logs' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>전체 데이터베이스 조회</h3>
              <button onClick={downloadCSV} style={{ padding: '8px 16px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                📥 CSV 다운로드
              </button>
            </div>
            
            <div style={{ overflowX: 'auto', border: '1px solid #dadce0', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr style={{ borderBottom: '1px solid #dadce0', color: '#5f6368' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>고유 ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>테마명</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>컨셉</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>예산</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>생성 일시</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {savedCourses.map((course) => (
                    <tr key={course.id} style={{ borderBottom: '1px solid #f1f3f4', color: '#202124' }}>
                      <td style={{ padding: '12px 16px', color: '#80868b', fontSize: '0.8rem' }}>{course.id.substring(0, 15)}...</td>
                      <td style={{ padding: '12px 16px' }}>{course.theme}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e8f0fe', color: '#1a73e8', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {course.concept || '미지정'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>₩{Number(course.total_budget || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', color: '#80868b' }}>{new Date(course.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => triggerDeleteCourse(course.id)}
                          style={{ padding: '4px 10px', backgroundColor: '#fff0f0', color: '#ea4335', border: '1px solid #fce8e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                  {savedCourses.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#80868b' }}>데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === 'stats' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>컨셉별 사용자 평균 예산</h3>
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={budgetByConceptData} margin={{ top: 35, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" tick={{ fill: '#5f6368' }} axisLine={false} tickLine={false} />
                  <YAxis width={80} tickFormatter={formatKoreanCurrency} tick={{ fill: '#5f6368', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} contentStyle={{ borderRadius: '4px', border: '1px solid #dadce0' }} />
                  <Bar dataKey="평균예산" fill="#34a853" radius={[4, 4, 0, 0]} barSize={50} minPointSize={10}>
                    <LabelList dataKey="평균예산" position="top" formatter={formatKoreanCurrency} fill="#202124" fontSize={13} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ textAlign: 'center', color: '#80868b', fontSize: '0.9rem', marginTop: '20px' }}>
              어떤 컨셉의 여행객이 가장 많은 예산을 준비하는지 파악하여 고부가가치 상품(세미패키지) 기획에 활용하세요.
            </p>
          </div>
        )}

        {/* 🌟 탭 4. 인구통계 대시보드 및 유저 관리 */}
        {activeMenu === 'users' && (
          <>
            {/* 1. 인구통계학적 분석 대시보드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#5f6368', fontWeight: 'bold' }}>📊 연령대별 가입자 분포</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer><BarChart data={ageData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4"/><XAxis dataKey="name" tick={{ fill: '#5f6368', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#5f6368', fontSize: 12 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #dadce0', fontSize: '12px' }}/><Bar dataKey="인원" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={30}><LabelList dataKey="인원" position="top" fill="#202124" fontSize={12} fontWeight="bold"/></Bar></BarChart></ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#5f6368', fontWeight: 'bold' }}>👤 성별 비율</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                        {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#5f6368', fontWeight: 'bold' }}>📍 거주 지역 분포</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer><BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f3f4"/><XAxis type="number" allowDecimals={false} hide/><YAxis type="category" dataKey="name" tick={{ fill: '#5f6368', fontSize: 12 }} axisLine={false} tickLine={false} width={70}/><Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #dadce0', fontSize: '12px' }}/><Bar dataKey="인원" fill="#34a853" radius={[0, 4, 4, 0]} barSize={20}><LabelList dataKey="인원" position="right" fill="#202124" fontSize={12} fontWeight="bold"/></Bar></BarChart></ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#5f6368', fontWeight: 'bold' }}>💼 직업군 분포</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer><BarChart data={jobData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f3f4"/><XAxis type="number" allowDecimals={false} hide/><YAxis type="category" dataKey="name" tick={{ fill: '#5f6368', fontSize: 12 }} axisLine={false} tickLine={false} width={70}/><Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #dadce0', fontSize: '12px' }}/><Bar dataKey="인원" fill="#fbbc04" radius={[0, 4, 4, 0]} barSize={20}><LabelList dataKey="인원" position="right" fill="#202124" fontSize={12} fontWeight="bold"/></Bar></BarChart></ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* 2. 유저 관리 테이블 */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0', fontSize: '1.1rem', color: '#202124', fontWeight: 'bold' }}>회원 계정 및 권한 관리</h3>
                <span style={{ fontSize: '0.85rem', color: '#1a73e8', backgroundColor: '#e8f0fe', padding: '6px 12px', borderRadius: '12px', fontWeight: 'bold' }}>총 가입자: {registeredUsers.length}명</span>
              </div>
              
              <div style={{ overflowX: 'auto', border: '1px solid #dadce0', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr style={{ borderBottom: '1px solid #dadce0', color: '#5f6368' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>계정 이메일</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>닉네임</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>인구통계(나이/성별/직업)</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center' }}>멤버십 등급</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center' }}>계정 관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredUsers.map((u) => (
                      <tr key={u.email} style={{ borderBottom: '1px solid #f1f3f4', color: '#202124' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '500' }}>{u.email}</td>
                        <td style={{ padding: '14px 16px' }}>{u.nickname}</td>
                        
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.75rem', background: '#edf2f7', color: '#4a5568', padding: '4px 8px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{u.age || '-'}</span>
                          <span style={{ fontSize: '0.75rem', background: '#edf2f7', color: '#4a5568', padding: '4px 8px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{u.gender || '-'}</span>
                          <span style={{ fontSize: '0.75rem', background: '#edf2f7', color: '#4a5568', padding: '4px 8px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{u.job || '-'}</span>
                          <span style={{ fontSize: '0.75rem', background: '#e6fffa', color: '#319795', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>📍 {u.region || '-'}</span>
                        </td>
                        
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button onClick={() => togglePremiumStatus(u)} style={{ padding: '6px 12px', backgroundColor: u.is_premium ? '#fffaf0' : '#f1f3f4', color: u.is_premium ? '#dd6b20' : '#5f6368', border: u.is_premium ? '1px solid #fbd38d' : '1px solid #dadce0', borderRadius: '16px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '85px' }}>
                            {u.is_premium ? '👑 Premium' : 'Free'}
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button onClick={() => triggerDeleteUser(u.email)} style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#ea4335', border: '1px solid #ea4335', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>강제 탈퇴</button>
                        </td>
                      </tr>
                    ))}
                    {registeredUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#80868b' }}>아직 가입한 유저가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}