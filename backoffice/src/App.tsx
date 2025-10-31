import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Levels from './pages/Levels';
import Quiz from './pages/Quiz';
import Events from './pages/Events';
import Assets from './pages/Assets';
import Markets from './pages/Markets';
import GameInstances from './pages/GameInstances';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="levels" element={<Levels />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="events" element={<Events />} />
          <Route path="assets" element={<Assets />} />
          <Route path="markets" element={<Markets />} />
          <Route path="game-instances" element={<GameInstances />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

