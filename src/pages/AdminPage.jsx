// src/pages/AdminPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
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
        .order('created_at', { ascending: false }); // 테이블 조회를 위해 최신순 정렬

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
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [savedCourses]);

  // 3. [바 차트용] 최근 7일간 일별 저장 추이 가공
  const barChartData = useMemo(() => {
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
      date: date.slice(5), // '06-12' 형식으로 변환
      count: counts[date] || 0
    }));
  }, [savedCourses]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // 📊 상단 KPI 수치 계산
  const totalSaved = savedCourses.length;
  const averageBudget = totalSaved > 0 
    ? Math.round(savedCourses.reduce((sum, item) => sum + Number(item.total_budget), 0) / totalSaved)
    : 0;

  // 🚧 로그인 화면 (인증되지 않았을 때)
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔐</div>
          <h2 style={{ color: '#1a202c', marginBottom: '20px' }}>Sahara 백오피스</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="password"
              placeholder="관리자 비밀번호를 입력하세요"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '1rem', textAlign: 'center' }}
            />
            <button type="submit" style={{ padding: '12px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
              접속하기
            </button>
          </form>
          {loginError && <p style={{ color: '#e53e3e', marginTop: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>{loginError}</p>}
          <Link to="/" style={{ display: 'inline-block', marginTop: '20px', color: '#718096', textDecoration: 'none', fontSize: '0.9rem' }}>
            ⬅️ 고객 화면으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 🌟 관리자 대시보드 화면 (로그인 성공 시)
  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div>
          <span style={{ fontSize: '1.2rem', color: '#0056b3', fontWeight: 'bold' }}>◎ Sahara</span>
          <h1 style={{ margin: '5px 0 0 0', fontSize: '2rem', color: '#1a202c' }}>관리자 대시보드</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchCloudData} style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔄 새로고침
          </button>
          <button onClick={handleLogout} style={{ padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔒 로그아웃
          </button>
          <Link to="/" style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#0056b3', border: '1px solid #0056b3', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            고객 화면 ➡️
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* KPI 대시보드 섹션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #0056b3' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>총 누적 저장 건수 (전환량)</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>
              {isLoading ? '...' : `${totalSaved}건`}
            </p>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #48bb78' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>평균 추천 코스 예산</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>
              {isLoading ? '...' : `${averageBudget.toLocaleString()}원`}
            </p>
          </div>
        </div>

        {/* 📊 차트 섹션 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          {/* 테마별 선호도 분포 (Pie) */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>테마별 선호도 분포</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 주간 저장 추이 (Bar) */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>최근 7일간 저장 추이</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0056b3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Supabase 실시간 테이블 데이터 뷰어 */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>Supabase 실시간 테이블 현황 (`saved_courses`)</h3>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: '#718096', padding: '40px 0' }}>클라우드 서버에서 데이터를 불러오는 중...</p>
          ) : savedCourses.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #edf2f7', color: '#718096' }}>
                    <th style={{ padding: '12px' }}>ID</th>
                    <th style={{ padding: '12px' }}>테마명</th>
                    <th style={{ padding: '12px' }}>컨셉</th>
                    <th style={{ padding: '12px' }}>총 예산</th>
                    <th style={{ padding: '12px' }}>저장 일시</th>
                  </tr>
                </thead>
                <tbody>
                  {savedCourses.map((course) => (
                    <tr key={course.id} style={{ borderBottom: '1px solid #edf2f7', color: '#4a5568' }}>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: '#a0aec0' }}>{course.id.substring(0, 15)}...</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{course.theme}</td>
                      <td style={{ padding: '12px' }}><span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{course.concept}</span></td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{Number(course.total_budget).toLocaleString()}원</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(course.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#a0aec0', textAlign: 'center', padding: '40px 0' }}>데이터베이스가 비어 있습니다. 고객 화면에서 코스를 저장해 보세요!</p>
          )}
        </div>

      </div>
    </div>
  );
}