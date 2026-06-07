// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const [savedCourses, setSavedCourses] = useState([]);
  
  // 🔐 보안 로직을 위한 상태 변수들
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // 세션 스토리지에 로그인 기록이 있으면 바로 통과!
    if (sessionStorage.getItem('sahara_admin_auth') === 'true') {
      setIsAuthenticated(true);
    }

    const data = localStorage.getItem('sahara_saved_courses');
    if (data) {
      setSavedCourses(JSON.parse(data));
    }
  }, []);

  // 🔐 로그인 시도 함수
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'sahara2026') { // MVP용 비밀번호
      setIsAuthenticated(true);
      sessionStorage.setItem('sahara_admin_auth', 'true'); // 로그인 상태 임시 저장
      setLoginError('');
    } else {
      setLoginError('비밀번호가 일치하지 않습니다.');
    }
  };

  // 🔓 로그아웃 함수
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('sahara_admin_auth');
    setPasswordInput('');
  };

  // 🚧 인증되지 않은 사용자에게 보여줄 '잠금 화면'
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
            <button type="submit" style={{ padding: '12px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
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

  // --- 👇 여기서부터는 인증된 관리자에게만 보이는 진짜 대시보드 화면 ---

  const totalSaved = savedCourses.length;

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', maxWidth: '1200px', margin: '0 auto 40px auto' }}>
        <div>
          <span style={{ fontSize: '1.2rem', color: '#0056b3', fontWeight: 'bold' }}>◎ Sahara</span>
          <h1 style={{ margin: '5px 0 0 0', fontSize: '2rem', color: '#1a202c' }}>관리자 대시보드</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleLogout} style={{ padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔒 로그아웃
          </button>
          <Link to="/" style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#0056b3', border: '1px solid #0056b3', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            고객 화면 ➡️
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #0056b3' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>총 저장된 코스 (누적 전환)</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>{totalSaved}<span style={{ fontSize: '1.2rem', color: '#a0aec0', marginLeft: '5px' }}>건</span></p>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #48bb78' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>최근 7일 생성된 코스</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>- <span style={{ fontSize: '1.2rem', color: '#a0aec0', marginLeft: '5px' }}>건</span></p>
          </div>
        </div>

        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>고객 일정 보관함 현황 (Raw Data)</h3>
          {savedCourses.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {savedCourses.map((courseId, index) => (
                <li key={index} style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', color: '#4a5568' }}>
                  <span style={{ fontWeight: 'bold', color: '#0056b3', marginRight: '10px' }}>#{index + 1}</span> 
                  코스 ID: {courseId}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#a0aec0', textAlign: 'center', padding: '40px 0' }}>아직 저장된 코스 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}