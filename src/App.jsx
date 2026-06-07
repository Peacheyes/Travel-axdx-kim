// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 맨 처음 접속했을 때 보이는 기본 주소는 무조건 고객 화면(MainPage) */}
        <Route path="/" element={<MainPage />} />
        
        {/* 2. 주소창 뒤에 /admin 을 붙여야만 들어갈 수 있는 관리자 화면 */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;