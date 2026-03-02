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
    <div className="min-h-screen flex flex-col bg-black overflow-hidden p-4">
      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        {/* Tab header */}
        <header className="relative z-20 flex items-start h-20">
          {/* Logo Tab */}
          <div className="side-tab-left h-full flex items-center px-12 rounded-t-[3rem]">
            <h2 className="text-4xl logo-typography leading-none text-black">NOVA LOGO</h2>
          </div>

          {/* Navigation Tab */}
          <div className="flex-1 flex justify-center pt-2">
            <nav className="nav-tab flex items-center gap-2 px-8 h-14 shadow-2xl">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(item.path)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          isActive
                            ? 'bg-[#d7ff73] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <item.icon className="w-5 h-5" strokeWidth={isActive ? 3 : 2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white border-none">{labelMap[item.key](t)}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          {/* Utilities Tab */}
          <div className="side-tab-right h-full flex items-center gap-4 px-10 rounded-t-[3rem]">
            <button
              onClick={toggle}
              className="p-2 flex items-center justify-center text-black/60 hover:text-black transition"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="px-2 flex items-center justify-center text-sm font-bold text-black/60 hover:text-black transition"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full flex items-center justify-center text-black/60 hover:text-black transition">
                  <User className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 glass border-black/10">
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
        <main className="relative z-10 flex-1 bg-[#f8f7f9] rounded-b-[3rem] rounded-tr-[3rem] border-x border-b border-black/5 shadow-inner overflow-hidden">
          <div className="h-full w-full overflow-auto p-12">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="h-10 flex items-center justify-center text-white/20 text-[10px]">
        <span>{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
