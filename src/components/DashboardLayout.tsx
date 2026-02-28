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
    <div className="min-h-screen flex flex-col bg-background p-4 md:p-8">
      <div className="window-container flex-1 flex flex-col">
        {/* Top bar - Tab style */}
        <header className="window-header justify-between">
          <div className="window-tab">
            <h2 className="text-xl font-black italic tracking-tighter">Logo</h2>
          </div>

          <div className="flex-1 flex justify-center gap-6 text-sm font-bold uppercase tracking-widest px-4">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`transition-colors hover:text-brand-blue ${isActive ? 'text-brand-blue underline underline-offset-4 decoration-2' : 'text-foreground/60'}`}
                >
                  {labelMap[item.key](t)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-brand-neon transition-colors dark:border-white"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="px-4 py-1.5 rounded-full border-2 border-black font-bold text-sm hover:bg-brand-pink transition-colors dark:border-white"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-6 py-1.5 rounded-full bg-black text-white font-bold hover:bg-brand-blue transition-colors dark:bg-white dark:text-black">
                  Join Us
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-2 border-black rounded-2xl mt-2 dark:border-white">
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

        <main className="flex-1 p-8 overflow-auto relative bg-[#e9e8e0] dark:bg-black/20">
           {/* Decorative folder tab if needed or just content */}
           <div className="max-w-7xl mx-auto">
              <Outlet />
           </div>
        </main>

        <footer className="h-12 border-t-[3px] border-black flex items-center justify-center px-6 dark:border-white">
          <span className="text-xs font-bold uppercase tracking-widest">{t.copyright}</span>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
