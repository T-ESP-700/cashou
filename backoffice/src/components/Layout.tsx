import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Brain,
  Calendar,
  TrendingUp,
  Building2,
  Gamepad2,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import logoImage from '../Logo.png';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/levels', icon: Trophy, label: 'Levels' },
  { path: '/quiz', icon: Brain, label: 'Quiz' },
  { path: '/events', icon: Calendar, label: 'Events' },
  { path: '/assets', icon: TrendingUp, label: 'Assets' },
  { path: '/markets', icon: Building2, label: 'Markets' },
  { path: '/game-instances', icon: Gamepad2, label: 'Game Instances' },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-6">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <img src={logoImage} alt="Cashou Logo" className="h-8 w-8" />
              <h1 className="text-2xl font-bold" style={{ color: '#CDDC39' }}>Cashou</h1>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <img src={logoImage} alt="Cashou Logo" className="h-8 w-8" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
