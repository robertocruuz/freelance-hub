import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, KeyRound, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { key: 'home', icon: Home, path: '/dashboard' },
  { key: 'passwords', icon: KeyRound, path: '/dashboard/passwords' },
  { key: 'clients', icon: Users, path: '/dashboard/clients' },
  { key: 'projects', icon: FolderKanban, path: '/dashboard/projects' },
  { key: 'budgets', icon: FileText, path: '/dashboard/budgets' },
  { key: 'time', icon: Clock, path: '/dashboard/time' },
  { key: 'invoices', icon: Receipt, path: '/dashboard/invoices' },
] as const;

const labelMap: Record<string, (t: any) => string> = {
  home: () => 'Home',
  passwords: (t) => t.passwordGenerator,
  clients: (t) => t.clients,
  projects: (t) => t.projects,
  budgets: (t) => t.budgets,
  time: (t) => t.timeTracking,
  invoices: (t) => t.invoices,
};

const DashboardLayout = () => {
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#e9e8e0] dark:bg-background p-4 md:p-8">
      <div className="window-container flex-1 flex flex-col bg-transparent shadow-none border-none">
        {/* Top bar - Cleaned style */}
        <header className="window-header justify-between">
          <div className="window-tab">
            <h2 className="text-2xl uppercase">Logo</h2>
          </div>

          <div className="flex-1 flex justify-center gap-8 text-xs font-black uppercase tracking-widest px-4">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`transition-colors hover:text-brand-blue ${isActive ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-foreground/60'}`}
                >
                  {labelMap[item.key](t)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="px-3 py-1 font-black text-xs hover:text-brand-pink transition-colors"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform dark:bg-white dark:text-black">
                  <User className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-[3px] border-black rounded-2xl mt-2 dark:border-white">
                <DropdownMenuItem className="font-bold">
                  <User className="w-4 h-4 mr-2" /> {t.profile}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-bold">
                  <Settings className="w-4 h-4 mr-2" /> {t.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="font-bold text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto relative">
           <div className="max-w-7xl mx-auto">
              <Outlet />
           </div>
        </main>

        <footer className="h-16 flex items-end justify-between px-2">
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-2xl border-[3px] border-black flex items-center justify-center hover:bg-brand-neon transition-all active:scale-95 bg-white dark:border-white dark:bg-black"
          >
            {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{t.copyright}</span>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
