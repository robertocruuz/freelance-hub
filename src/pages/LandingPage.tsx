import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Users, FileText, Clock, FolderKanban, Receipt } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();

  const features = [
    {
      icon: KeyRound,
      title: lang === 'pt-BR' ? 'Senha & Cofre' : 'Passwords & Vault',
      desc: lang === 'pt-BR' ? 'Gere e armazene senhas com segurança' : 'Generate and store passwords securely',
    },
    {
      icon: Users,
      title: lang === 'pt-BR' ? 'Meus Clientes' : 'My Clients',
      desc: lang === 'pt-BR' ? 'Gerencie seus clientes e mantenha suas informações organizadas' : 'Manage clients and keep info organized',
    },
    {
      icon: FileText,
      title: lang === 'pt-BR' ? 'Orçamentos & Propostas' : 'Budgets & Proposals',
      desc: lang === 'pt-BR' ? 'Crie e gerencie orçamentos e propostas' : 'Create and manage budgets and proposals',
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      desc: lang === 'pt-BR' ? 'Registre horas e organize seu tempo' : 'Track hours and organize your time',
    },
    {
      icon: FolderKanban,
      title: lang === 'pt-BR' ? 'Projetos' : 'Projects',
      desc: lang === 'pt-BR' ? 'Organize e acompanhe seus projetos' : 'Organize and track your projects',
    },
    {
      icon: Receipt,
      title: lang === 'pt-BR' ? 'Faturamento' : 'Invoicing',
      desc: lang === 'pt-BR' ? 'Gere faturas profissionais' : 'Generate professional invoices',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Tab Header */}
      <header className="relative z-10 tab-header flex items-center justify-between px-8 pt-4 pb-5">
        <h2 className="text-xl font-bold font-display tracking-tight">Logo*</h2>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-xs font-semibold">
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="h-9 px-5 rounded-full bg-background text-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            {lang === 'pt-BR' ? 'Entrar' : 'Join Us'}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-8 hero-gradient">
        <div className="w-full max-w-5xl animate-fade-in">
          <div className="text-center md:text-left py-12 md:py-16">
            <h1 className="text-5xl md:text-7xl font-display text-foreground leading-tight">
              {lang === 'pt-BR' ? 'Plataforma de Serviços\npara Freelancers' : 'Service Platform\nfor Freelancers'}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg whitespace-pre-line">
              {t.heroSubtitle}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-8 py-3.5 rounded-full btn-glow text-primary-foreground font-semibold text-lg"
            >
              {lang === 'pt-BR' ? 'Gerencie tudo em um só lugar' : 'Manage everything in one place'}
            </button>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-foreground text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 py-6 hero-gradient">
        <span className="text-xs text-muted-foreground/50">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default LandingPage;
