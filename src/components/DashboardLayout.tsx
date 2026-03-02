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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Tab header */}
      <header className="relative z-20 tab-header px-6 pt-3 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold font-display tracking-tight">Logo</h2>

        <nav className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/10">
          {navItems.map((item) => {
            const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-current opacity-60 hover:opacity-100 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="glass text-foreground border-none">{labelMap[item.key](t)}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-xs font-semibold"
          >
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center">
                <User className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 glass border-none">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" /> {t.profile}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" /> {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> {t.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 p-6 overflow-auto hero-gradient">
        <Outlet />
      </main>

      <footer className="relative z-20 h-10 flex items-center justify-center px-6 hero-gradient">
        <span className="text-[11px] text-muted-foreground/50">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
