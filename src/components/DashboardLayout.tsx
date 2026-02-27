import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun } from 'lucide-react';
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
  { key: 'passwords', icon: KeyRound, path: '/dashboard/passwords' },
  { key: 'clients', icon: Users, path: '/dashboard/clients' },
  { key: 'projects', icon: FolderKanban, path: '/dashboard/projects' },
  { key: 'budgets', icon: FileText, path: '/dashboard/budgets' },
  { key: 'time', icon: Clock, path: '/dashboard/time' },
  { key: 'invoices', icon: Receipt, path: '/dashboard/invoices' },
] as const;

const labelMap: Record<string, (t: any) => string> = {
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
    <div className="min-h-screen flex flex-col hero-gradient">
      {/* Top bar - glass */}
      <header className="relative z-20 h-16 flex items-center justify-between px-6">
        <h2 className="text-lg font-bold font-display text-foreground tracking-tight">Logo</h2>

        <nav className="glass-pill flex items-center gap-1 px-2 py-1.5 rounded-2xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
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
            className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
          </button>

          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="h-9 px-3 rounded-xl glass-pill text-xs font-semibold text-foreground"
          >
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-full glass-pill flex items-center justify-center">
                <User className="w-4 h-4 text-foreground" />
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

      <main className="relative z-10 flex-1 p-6 overflow-auto">
        <Outlet />
      </main>

      <footer className="relative z-20 h-10 flex items-center justify-center px-6">
        <span className="text-[11px] text-muted-foreground/50">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
