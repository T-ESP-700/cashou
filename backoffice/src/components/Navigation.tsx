import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users as UsersIcon, Gamepad2, Settings } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard Jeu', icon: BarChart3 },
    { path: '/users', label: 'Utilisateurs', icon: UsersIcon },
    { path: '/game-instances', label: 'Instances de Jeu', icon: Gamepad2 },
    { path: '/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="h-8 w-8" />
          <h1 className="text-xl font-bold">Cashou Backoffice</h1>
        </div>
        
        <div className="flex space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
