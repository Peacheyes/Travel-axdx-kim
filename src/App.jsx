// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';

function App() {g
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 주소(루트) 접속 시: 고객용 AI 코스 추천 화면 */}
        <Route path="/" element={<MainPage />} />
        
        {/* /admin 주소 접속 시: 관리자 대시보드 화면 */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;