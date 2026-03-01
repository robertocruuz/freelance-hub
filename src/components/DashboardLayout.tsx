import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, KeyRound, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun, Languages } from 'lucide-react';
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
      {/* Top bar - brutalist */}
      <header className="relative z-20 h-20 flex items-center justify-between px-6 border-b-4 border-foreground bg-card">
        <h2
          className="text-2xl font-black font-display text-foreground tracking-tighter uppercase italic cursor-pointer"
          onClick={() => navigate('/')}
        >
          Logo
        </h2>

        <nav className="hidden lg:flex items-center gap-2 bg-secondary/20 p-2 border-2 border-foreground rounded-xl">
          {navItems.map((item) => {
            const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`h-10 px-4 rounded-lg flex items-center justify-center transition-all duration-200 border-2 font-bold uppercase text-xs tracking-widest ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] translate-y-[-1px]'
                        : 'text-muted-foreground border-transparent hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {labelMap[item.key](t).split(' ')[0]}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-card border-2 border-foreground font-bold uppercase text-[10px] tracking-widest">
                  {labelMap[item.key](t)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex bg-accent/10 border-2 border-foreground rounded-xl p-1">
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-background transition-colors font-black text-xs"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-12 h-12 brutalist-button-primary rounded-full flex items-center justify-center p-0">
                <User className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-4 border-foreground p-2 rounded-xl mt-2 shadow-brutalist">
              <DropdownMenuItem className="focus:bg-secondary focus:text-secondary-foreground font-black uppercase tracking-widest text-xs py-3 cursor-pointer">
                <User className="w-4 h-4 mr-3" /> {t.profile}
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground font-black uppercase tracking-widest text-xs py-3 cursor-pointer">
                <Settings className="w-4 h-4 mr-3" /> {t.settings}
              </DropdownMenuItem>
              <div className="h-1 bg-foreground my-1"></div>
              <DropdownMenuItem onClick={handleLogout} className="focus:bg-destructive focus:text-destructive-foreground font-black uppercase tracking-widest text-xs py-3 cursor-pointer text-destructive">
                <LogOut className="w-4 h-4 mr-3" /> {t.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative z-10 flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <footer className="relative z-20 h-12 flex items-center justify-center px-6 border-t-2 border-foreground/10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
