import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, KeyRound, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun, Globe } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-[#f1f0ee] dark:bg-background transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8">
        {/* Top Header Section */}
        <header className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <span className="text-white font-black text-xl italic">F</span>
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">FreelanceHub</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full bg-white shadow-sm hover:shadow-md transition-all"
            >
              <Globe className="w-4 h-4 text-brand-blue" />
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>

            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 hidden sm:inline">Account</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-none shadow-xl p-2">
                <DropdownMenuItem className="rounded-xl font-semibold py-3 cursor-pointer">
                  <User className="w-4 h-4 mr-3" /> {t.profile}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-semibold py-3 cursor-pointer">
                  <Settings className="w-4 h-4 mr-3" /> {t.settings}
                </DropdownMenuItem>
                <div className="h-[1px] bg-slate-100 my-1 mx-2" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl font-semibold py-3 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-3" /> {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Folder Layout Container */}
        <div className="relative">
          {/* Navigation Tabs (Folder Tabs) */}
          <nav className="flex items-end px-4 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "folder-tab whitespace-nowrap group",
                    isActive
                      ? "folder-tab-active"
                      : "folder-tab-inactive"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 mr-2 transition-colors",
                    isActive ? "text-brand-blue" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  {labelMap[item.key](t)}
                </button>
              );
            })}
          </nav>

          {/* Folder Body (Content Area) */}
          <div className="folder-body">
            <Outlet />
          </div>
        </div>

        <footer className="mt-8 flex justify-between items-center px-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.copyright}</p>
          <div className="flex gap-4">
             <span className="text-xs font-bold text-slate-400 hover:text-brand-blue cursor-pointer transition-colors">Privacy</span>
             <span className="text-xs font-bold text-slate-400 hover:text-brand-blue cursor-pointer transition-colors">Support</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
