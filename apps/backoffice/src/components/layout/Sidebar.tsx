import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Gamepad2,
  Calendar,
  Target,
  BookOpen,
  HelpCircle,
  MessageSquare,
  User,
  Palette,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Game Management',
    href: '/game',
    icon: Gamepad2,
    children: [
      { title: 'Levels', href: '/levels', icon: LayoutDashboard },
      { title: 'Events', href: '/events', icon: Calendar },
      { title: 'Goals', href: '/goals', icon: Target },
    ],
  },
  {
    title: 'Quiz System',
    href: '/quiz',
    icon: BookOpen,
    children: [
      { title: 'Quizzes', href: '/quizzes', icon: BookOpen },
      { title: 'Questions', href: '/questions', icon: HelpCircle },
      { title: 'Answers', href: '/answers', icon: MessageSquare },
    ],
  },
  {
    title: 'Mon profil',
    href: '/profile',
    icon: User,
  },
  {
    title: 'UI Demo',
    href: '/ui',
    icon: Palette,
  },
];

export function Sidebar() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold text-gray-900">Cashou Backoffice</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => (
            <div key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>

              {/* Sub-navigation */}
              {item.children && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      to={child.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        isActive(child.href)
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-gray-500">
            Cashou Backoffice v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
