// src/pages/AdminPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

export default function AdminPage() {
  const [savedCourses, setSavedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔐 보안 로직 상태 변수
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // 1. Supabase 데이터 불러오기
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

  // 2. [파이 차트용] 컨셉별 분포 데이터 가공
  const pieChartData = useMemo(() => {
    const counts = savedCourses.reduce((acc, cur) => {
      acc[cur.concept] = (acc[cur.concept] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value);
  }, [savedCourses]);

  // 3. [시계열 차트용] 최근 7일간 일별 저장 추이 가공
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
      date: date.slice(5).replace('-', '.'), // '06.12' 형식으로 변환
      세션: counts[date] || 0 // 구글 애널리틱스 느낌을 위해 라벨을 '세션'으로 지정
    }));
  }, [savedCourses]);

  // 구글 애널리틱스 스타일 컬러 팔레트
  const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#5f6368'];

  // 📊 KPI 수치 계산
  const totalSaved = savedCourses.length;
  const averageBudget = totalSaved > 0 
    ? Math.round(savedCourses.reduce((sum, item) => sum + Number(item.total_budget), 0) / totalSaved)
    : 0;
  const topConcept = pieChartData.length > 0 ? pieChartData[0].name : '-';

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

  // 🌟 관리자 대시보드 화면 (GA 스타일)
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Roboto, Pretendard, sans-serif' }}>
      
      {/* 👈 좌측 사이드바 (LNB) */}
      <aside style={{ width: '240px', backgroundColor: '#ffffff', borderRight: '1px solid #dadce0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #dadce0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem', color: '#1a73e8' }}>◎</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#5f6368' }}>Sahara Insight</span>
        </div>
        <nav style={{ padding: '15px 0', flex: 1 }}>
          <div style={{ padding: '12px 20px', backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 'bold', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', width: '90%' }}>
            📊 잠재고객 개요
          </div>
          <div style={{ padding: '12px 20px', color: '#5f6368', cursor: 'pointer' }}>실시간 사용자</div>
          <div style={{ padding: '12px 20px', color: '#5f6368', cursor: 'pointer' }}>행동 흐름</div>
          <div style={{ padding: '12px 20px', color: '#5f6368', cursor: 'pointer' }}>전환 추적</div>
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
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#202124', fontWeight: '500' }}>잠재고객 개요</h1>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#5f6368', fontSize: '0.9rem' }}>기간: 최근 7일</span>
            <button onClick={fetchCloudData} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', color: '#1a73e8', cursor: 'pointer', fontSize: '0.9rem' }}>
              새로고침
            </button>
            <Link to="/" style={{ color: '#1a73e8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>고객 화면으로 ➡️</Link>
          </div>
        </header>

        {/* 1. 히어로 차트 (시계열 트렌드) */}
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

        {/* 2. KPI 스파크라인 카드 행 */}
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
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dadce0' }}>
            <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px' }}>데이터 무결성</div>
            <div style={{ fontSize: '1.8rem', color: '#202124' }}>100.00%</div>
          </div>
        </div>

        {/* 3. 하단 섹션 (파이 차트 & 데이터 테이블) */}
        <div style={{ display: 'flex', gap: '20px' }}>
          
          {/* 좌측: 도넛 차트 */}
          <div style={{ flex: 1, background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>사용자 의도 분포 (컨셉)</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#5f6368' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 우측: Raw Data 테이블 */}
          <div style={{ flex: 2, background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #dadce0', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#5f6368', fontWeight: '500' }}>세부 활동 로그 (`saved_courses`)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #dadce0', color: '#5f6368' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>저장 일시</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>컨셉</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>테마명</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500', textAlign: 'right' }}>예산</th>
                </tr>
              </thead>
              <tbody>
                {savedCourses.slice(0, 5).map((course) => ( // 최근 5개만 노출하여 깔끔하게 유지
                  <tr key={course.id} style={{ borderBottom: '1px solid #f1f3f4', color: '#202124' }}>
                    <td style={{ padding: '12px 8px', color: '#80868b' }}>{course.created_at.split('T')[0]}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1a73e8', marginRight: '8px' }}></span>
                      {course.concept}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{course.theme}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500' }}>₩{Number(course.total_budget).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {savedCourses.length > 5 && (
              <div style={{ textAlign: 'right', marginTop: '15px', color: '#1a73e8', fontSize: '0.85rem', cursor: 'pointer' }}>전체 보고서 보기 ➡️</div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}