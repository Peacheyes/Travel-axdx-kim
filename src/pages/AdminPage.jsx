// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const [savedCourses, setSavedCourses] = useState([]);

  useEffect(() => {
    const data = localStorage.getItem('sahara_saved_courses');
    if (data) {
      setSavedCourses(JSON.parse(data));
    }
  }, []);

  // 📊 KPI 1: 총 저장된 코스 수
  const totalSaved = savedCourses.length;

  // 📊 KPI 2: 테마별 선호도 계산
  const themeCounts = savedCourses.reduce((acc, id) => {
    // 임시로 ID값을 기반으로 분류 (실제로는 객체 데이터에서 theme를 뽑아야 함)
    acc['관심 코스'] = (acc['관심 코스'] || 0) + 1; 
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', maxWidth: '1200px', margin: '0 auto 40px auto' }}>
        <div>
          <span style={{ fontSize: '1.2rem', color: '#0056b3', fontWeight: 'bold' }}>◎ Sahara</span>
          <h1 style={{ margin: '5px 0 0 0', fontSize: '2rem', color: '#1a202c' }}>관리자 대시보드</h1>
        </div>
        <Link to="/" style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#0056b3', border: '1px solid #0056b3', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', transition: 'all 0.2s' }}>
          고객 화면으로 돌아가기 ➡️
        </Link>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {/* KPI 카드 1 */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #0056b3' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>총 저장된 코스 (누적 전환)</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>{totalSaved}<span style={{ fontSize: '1.2rem', color: '#a0aec0', marginLeft: '5px' }}>건</span></p>
          </div>
          {/* KPI 카드 2 */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #48bb78' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#718096', fontSize: '1.1rem' }}>최근 7일 생성된 코스</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#1a202c' }}>- <span style={{ fontSize: '1.2rem', color: '#a0aec0', marginLeft: '5px' }}>건 (DB 연동 시 활성화)</span></p>
          </div>
        </div>

        {/* 저장된 코스 로우 데이터 (Raw Data) 목록 */}
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