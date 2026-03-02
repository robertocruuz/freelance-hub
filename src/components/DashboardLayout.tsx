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
import { motion, AnimatePresence } from 'framer-motion';

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
      {/* Sticky Tab header with Blue Background */}
      <header className="sticky top-0 z-50 tab-header-blue px-6 pt-3 pb-4 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-bold font-display tracking-tight text-white italic">Logo*</h2>

        {/* Floating pill navigation */}
        <nav className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/10 border-2 border-black/20">
          {navItems.map((item) => {
            const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                      isActive
                        ? 'bg-[#d7ff73] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'text-white border-transparent hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <item.icon className="w-[20px] h-[20px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="brutalist-card text-foreground">{labelMap[item.key](t)}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition border-2 border-transparent hover:border-white/20 text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition text-xs font-bold text-white border-2 border-transparent hover:border-white/20"
          >
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center border-2 border-transparent hover:border-white/20 text-white">
                <User className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 brutalist-card mt-2">
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                <User className="w-4 h-4 mr-2" /> {t.profile}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                <Settings className="w-4 h-4 mr-2" /> {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-destructive/10 text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> {t.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-20 h-12 flex items-center justify-center px-6 bg-background border-t-2 border-black/5">
        <span className="text-xs font-medium text-muted-foreground">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
