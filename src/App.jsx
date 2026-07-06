import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Score from './pages/Score';
import Schedule from './pages/Schedule';
import Results from './pages/Results';
import Teams from './pages/Teams';
import About from './pages/About';

// 前台應用：僅含對外公開頁面。
// 管理後台掛載於 /admin 路徑（見 src/main.jsx 與 src/admin），與前台分離。
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="score" element={<Score />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="results" element={<Results />} />
        <Route path="teams" element={<Teams />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
