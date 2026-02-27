import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, FileText, Clock, Receipt, User, HelpCircle, LogOut, Settings } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import FooterControls from '@/components/FooterControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { key: 'passwords', icon: KeyRound, path: '/dashboard/passwords' },
  { key: 'budgets', icon: FileText, path: '/dashboard/budgets' },
  { key: 'time', icon: Clock, path: '/dashboard/time' },
  { key: 'invoices', icon: Receipt, path: '/dashboard/invoices' },
] as const;

const labelMap: Record<string, (t: any) => string> = {
  passwords: (t) => t.passwordGenerator,
  budgets: (t) => t.budgets,
  time: (t) => t.timeTracking,
  invoices: (t) => t.invoices,
};

const DashboardLayout = () => {
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-sidebar">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-sidebar-border">
        <h2 className="text-lg font-bold font-display text-sidebar-foreground">Logo</h2>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{labelMap[item.key](t)}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors">
              <User className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
      </header>

      <main className="flex-1 p-6 overflow-auto bg-background">
        <Outlet />
      </main>

      <footer className="h-12 flex items-center justify-between px-6 border-t border-sidebar-border bg-sidebar">
        <FooterControls />
        <span className="text-xs text-sidebar-foreground/40">{t.copyright}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="text-xs font-medium px-2 py-1 rounded bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
          >
            {lang === 'pt-BR' ? 'PT-BR' : 'EN'}
          </button>
          <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-sidebar-accent transition-colors">
            <HelpCircle className="w-4 h-4 text-sidebar-foreground/60" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
