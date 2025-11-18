import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between px-6">
        <div>
          {/* Breadcrumb or page title can go here */}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            Admin
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </header>
  );
}
