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
  home: () => 'Início',
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-accent-foreground">
      {/* Top bar - brutalist */}
      <header className="relative z-20 h-24 flex items-center justify-between px-8 border-b-8 border-foreground bg-card">
        <div className="flex items-center gap-12">
            <h2
              className="text-4xl font-black font-display text-foreground tracking-tighter uppercase italic cursor-pointer leading-none"
              onClick={() => navigate('/')}
            >
              Logo
            </h2>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(item.path)}
                        className={`h-12 px-5 flex items-center justify-center transition-all duration-100 border-x-2 border-transparent font-black uppercase text-[10px] tracking-[0.2em] relative group ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-foreground scale-105 z-10 shadow-brutalist-sm translate-y-[-2px]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 stroke-[3] ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        {labelMap[item.key](t).split(' ')[0]}
                        {isActive && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-accent"></div>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-foreground text-background border-none font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-none">
                      {labelMap[item.key](t)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-card border-4 border-foreground rounded-lg p-1 shadow-brutalist-sm">
            <button
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded transition-colors border-none bg-transparent p-0"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded transition-colors font-black text-xs border-none bg-transparent"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-14 h-14 brutalist-button-primary rounded-full p-0 flex items-center justify-center">
                <User className="w-8 h-8 stroke-[3]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-card border-4 border-foreground p-3 rounded-none mt-4 shadow-brutalist-lg">
              <DropdownMenuItem className="focus:bg-secondary focus:text-secondary-foreground font-black uppercase tracking-widest text-[10px] py-4 cursor-pointer">
                <User className="w-4 h-4 mr-4" /> {t.profile}
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground font-black uppercase tracking-widest text-[10px] py-4 cursor-pointer">
                <Settings className="w-4 h-4 mr-4" /> {t.settings}
              </DropdownMenuItem>
              <div className="h-1 bg-foreground my-2"></div>
              <DropdownMenuItem onClick={handleLogout} className="focus:bg-destructive focus:text-destructive-foreground font-black uppercase tracking-widest text-[10px] py-4 cursor-pointer text-destructive">
                <LogOut className="w-4 h-4 mr-4" /> {t.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative z-10 flex-1 p-10 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <footer className="relative z-20 h-14 flex items-center justify-center px-8 border-t-4 border-foreground bg-card">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground italic">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
