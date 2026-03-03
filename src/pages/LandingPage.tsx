import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FileText, Clock, FolderKanban, Receipt, Moon, Sun, Menu, X, ArrowRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: KeyRound,
      title: lang === 'pt-BR' ? 'Senha & Cofre' : 'Passwords & Vault',
      desc: lang === 'pt-BR' ? 'Gere e armazene senhas com segurança' : 'Generate and store passwords securely',
      color: 'bg-blue-500/10 text-blue-500'
    },
    {
      icon: Users,
      title: lang === 'pt-BR' ? 'Meus Clientes' : 'My Clients',
      desc: lang === 'pt-BR' ? 'Gerencie seus clientes e mantenha suas informações organizadas' : 'Manage clients and keep info organized',
      color: 'bg-green-500/10 text-green-500'
    },
    {
      icon: FileText,
      title: lang === 'pt-BR' ? 'Orçamentos & Propostas' : 'Budgets & Proposals',
      desc: lang === 'pt-BR' ? 'Crie e gerencie orçamentos e propostas' : 'Create and manage budgets and proposals',
      color: 'bg-pink-500/10 text-pink-500'
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      desc: lang === 'pt-BR' ? 'Registre horas e organize seu tempo' : 'Track hours and organize your time',
      color: 'bg-yellow-500/10 text-yellow-500'
    },
    {
      icon: FolderKanban,
      title: lang === 'pt-BR' ? 'Projetos' : 'Projects',
      desc: lang === 'pt-BR' ? 'Organize e acompanhe seus projetos' : 'Organize and track your projects',
      color: 'bg-purple-500/10 text-purple-500'
    },
    {
      icon: Receipt,
      title: lang === 'pt-BR' ? 'Faturamento' : 'Invoicing',
      desc: lang === 'pt-BR' ? 'Gere faturas profissionais' : 'Generate professional invoices',
      color: 'bg-cyan-500/10 text-cyan-500'
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f8f7f9] overflow-hidden">
      {/* Desktop Header */}
      <header className="relative z-50 h-24 hidden lg:flex items-center justify-between px-12">
        <h2 className="logo-typography !text-2xl">NOVA LOGO</h2>

        <div className="flex items-center gap-6">
          <div className="flex items-center bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-black/5 gap-4">
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition text-black/50 hover:text-black"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="h-10 px-4 rounded-xl hover:bg-black/5 transition text-sm font-bold text-black/50 hover:text-black"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="h-14 px-8 rounded-2xl bg-black text-white font-bold hover:bg-black/80 transition-all flex items-center gap-2 group shadow-xl shadow-black/10"
          >
            {lang === 'pt-BR' ? 'Entrar na Plataforma' : 'Join the Platform'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-8 h-20 relative z-50">
        <h2 className="logo-typography !text-xl">NOVA LOGO</h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-black text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black lg:hidden pt-24 px-8 flex flex-col">
          <div className="flex flex-col gap-6">
             <button
              onClick={() => navigate('/login')}
              className="w-full h-16 rounded-2xl bg-[#d7ff73] text-black font-bold text-xl flex items-center justify-center gap-2"
            >
              {lang === 'pt-BR' ? 'Entrar' : 'Join Us'}
            </button>
            <div className="grid grid-cols-2 gap-4 mt-8">
               <button
                onClick={toggle}
                className="h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white"
              >
                {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
              <button
                onClick={() => {
                  setLang(lang === 'pt-BR' ? 'en' : 'pt-BR');
                  setIsMobileMenuOpen(false);
                }}
                className="h-16 rounded-2xl bg-white/10 text-white font-bold text-lg"
              >
                {lang === 'pt-BR' ? 'EN' : 'PT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-8 pt-12 lg:pt-24">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-24">
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-bold text-black leading-[0.9] tracking-tighter mb-12 animate-fade-in">
              {lang === 'pt-BR' ? 'SERVICES\nPLATFORM' : 'SERVICES\nPLATFORM'}
            </h1>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-6xl mx-auto text-left border-t border-black/10 pt-12">
              <p className="text-2xl text-black/60 max-w-xl leading-relaxed font-medium">
                {t.heroSubtitle}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="h-20 px-12 rounded-full bg-[#1369db] text-white font-bold text-2xl hover:scale-105 transition-all shadow-2xl shadow-blue-500/20 whitespace-nowrap"
              >
                {lang === 'pt-BR' ? 'Comece Agora' : 'Start Now'}
              </button>
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {features.map((f, idx) => (
              <div
                key={f.title}
                className="bg-white border border-black/5 rounded-[3rem] p-10 flex flex-col gap-12 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-3xl ${f.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-black mb-4">{f.title}</h3>
                  <p className="text-lg text-black/50 leading-relaxed font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-12 py-10 border-t border-black/5">
        <span className="text-sm font-bold text-black/20 tracking-widest uppercase">{t.copyright}</span>
        <div className="flex gap-8">
           <span className="text-sm font-bold text-black/40 uppercase cursor-pointer hover:text-black transition-colors">Privacy</span>
           <span className="text-sm font-bold text-black/40 uppercase cursor-pointer hover:text-black transition-colors">Terms</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
