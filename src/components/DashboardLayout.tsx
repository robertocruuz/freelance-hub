import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, KeyRound, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun, Menu } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex ${mobile ? 'flex-col gap-4' : 'items-center gap-2'}`}>
      {navItems.map((item) => {
        const isActive =
          item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === item.path;
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  navigate(item.path);
                  if (mobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center transition-all duration-200 ${
                  mobile
                    ? `w-full h-12 rounded-xl gap-3 px-4 justify-start ${isActive ? 'bg-[#d7ff73] text-black font-bold' : 'text-white/60 hover:text-white'}`
                    : `w-11 h-11 transition-all ${isActive ? 'nav-item-active' : 'nav-item'}`
                }`}
              >
                <item.icon className={mobile ? "w-6 h-6" : "w-5 h-5"} strokeWidth={isActive ? 2.5 : 2} />
                {mobile && <span className="text-lg">{labelMap[item.key](t)}</span>}
              </button>
            </TooltipTrigger>
            {!mobile && (
              <TooltipContent className="bg-black text-white border-none font-medium">
                {labelMap[item.key](t)}
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans overflow-x-hidden">
      {/* Desktop Header */}
      <header className="h-20 hidden lg:flex items-stretch justify-between relative z-10">
        <div className="flex items-stretch">
          <div className="bg-[#f8f7f9] flex items-center px-10 rounded-br-[2rem]">
            <h2 className="logo-typography">NOVA LOGO</h2>
          </div>
          <div className="w-8 bg-[#f8f7f9] relative">
             <div className="absolute inset-0 bg-black rounded-tl-[2rem]"></div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-black">
          <nav>
            <div className="bg-white/5 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-1">
              <NavContent />
            </div>
          </nav>
        </div>

        <div className="flex items-stretch">
           <div className="w-8 bg-[#f8f7f9] relative">
             <div className="absolute inset-0 bg-black rounded-tr-[2rem]"></div>
          </div>
          <div className="bg-[#f8f7f9] flex items-center px-10 rounded-bl-[2rem] gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-black/50 hover:text-black hover:bg-black/5 transition"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
                className="h-10 px-3 flex items-center justify-center text-sm font-bold text-black/50 hover:text-black hover:bg-black/5 rounded-xl transition"
              >
                {lang === 'pt-BR' ? 'PT' : 'EN'}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center text-black/50 hover:text-black hover:bg-black/5 transition">
                    <User className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-black/10 shadow-xl">
                  <DropdownMenuItem className="rounded-lg py-3 cursor-pointer">
                    <User className="w-4 h-4 mr-3" /> <span className="font-medium">{t.profile}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg py-3 cursor-pointer">
                    <Settings className="w-4 h-4 mr-3" /> <span className="font-medium">{t.settings}</span>
                  </DropdownMenuItem>
                  <div className="h-px bg-black/5 my-1" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-lg py-3 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-3" /> <span className="font-medium">{t.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-6 h-16 bg-[#f8f7f9]">
        <h2 className="logo-typography !text-xl">NOVA LOGO</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-black/50 hover:bg-black/5"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-black text-white ml-2">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black border-white/10 text-white w-[300px] p-0">
              <div className="flex flex-col h-full py-12 px-6">
                <div className="mb-12">
                  <h2 className="logo-typography text-white">NOVA LOGO</h2>
                </div>
                <NavContent mobile />
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                    <button
                      onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
                      className="text-white font-bold text-lg"
                    >
                      {lang === 'pt-BR' ? 'Português' : 'English'}
                    </button>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-red-400 p-4 rounded-xl hover:bg-white/5 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold text-lg">{t.logout}</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content (Folder Body) */}
      <main className="flex-1 bg-[#f8f7f9] lg:rounded-t-[3rem] relative z-0 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-12">
          <Outlet />
        </div>

        <footer className="py-12 flex items-center justify-center text-black/20 text-[11px] font-medium tracking-widest uppercase">
          <span>{t.copyright}</span>
        </footer>
      </main>
    </div>
  );
};

export default DashboardLayout;
