import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FileText, Clock, FolderKanban, Receipt, ArrowUpRight } from 'lucide-react';
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
      desc: lang === 'pt-BR' ? 'Gere e armazene senhas com segurança total' : 'Generate and store passwords securely',
    },
    {
      icon: Users,
      title: lang === 'pt-BR' ? 'Meus Clientes' : 'My Clients',
      desc: lang === 'pt-BR' ? 'Gerencie seus clientes e mantenha tudo organizado' : 'Manage clients and keep info organized',
    },
    {
      icon: FileText,
      title: lang === 'pt-BR' ? 'Orçamentos' : 'Budgets',
      desc: lang === 'pt-BR' ? 'Crie orçamentos e propostas profissionais' : 'Create professional budgets and proposals',
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      desc: lang === 'pt-BR' ? 'Registre horas e organize seu tempo de trabalho' : 'Track hours and organize your time',
    },
    {
      icon: FolderKanban,
      title: lang === 'pt-BR' ? 'Projetos & Kanban' : 'Projects & Kanban',
      desc: lang === 'pt-BR' ? 'Organize e acompanhe seus projetos visualmente' : 'Organize and track your projects visually',
    },
    {
      icon: Receipt,
      title: lang === 'pt-BR' ? 'Faturamento' : 'Invoicing',
      desc: lang === 'pt-BR' ? 'Gere faturas profissionais automaticamente' : 'Generate professional invoices automatically',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Hero Section - Bold Blue */}
      <section className="relative landing-hero-bg min-h-[85vh] flex flex-col">
        {/* Header */}
        <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            Logo<span className="text-landing-accent">*</span>
          </h2>
          <nav className="hidden md:flex items-center gap-1">
            {[
              lang === 'pt-BR' ? 'Recursos' : 'Features',
              lang === 'pt-BR' ? 'Preços' : 'Pricing',
              lang === 'pt-BR' ? 'Sobre' : 'About',
            ].map((item) => (
              <button
                key={item}
                className="px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition text-white"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 transition text-xs font-semibold text-white"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="h-9 px-6 rounded-full bg-landing-accent text-landing-accent-foreground text-sm font-bold hover:brightness-110 transition-all"
            >
              {lang === 'pt-BR' ? 'Começar grátis' : 'Get Started'}
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-16">
          {/* Decorative floating elements */}
          <div className="absolute top-[15%] left-[8%] w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 rotate-12 animate-float" />
          <div className="absolute top-[25%] right-[10%] w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 -rotate-6 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-[20%] left-[15%] w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 rotate-6 animate-float" style={{ animationDelay: '2s' }} />

          {/* Decorative arrows */}
          <svg className="absolute top-[20%] right-[18%] w-16 h-16 text-landing-accent opacity-80 hidden md:block" viewBox="0 0 64 64" fill="none">
            <path d="M8 56C8 56 20 40 32 32C44 24 56 8 56 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M44 8H56V20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="absolute bottom-[25%] left-[10%] w-12 h-12 text-landing-accent opacity-80 hidden md:block rotate-180" viewBox="0 0 64 64" fill="none">
            <path d="M8 56C8 56 20 40 32 32C44 24 56 8 56 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M44 8H56V20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="text-center max-w-5xl animate-fade-in">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[0.9] tracking-tighter">
              {lang === 'pt-BR' ? (
                <>
                  <span className="text-landing-accent">#</span>PLATAFORMA
                  <br />
                  <span className="text-white/90">FREELANCER</span>
                  <br />
                  <span className="text-white/80">PRO</span>
                </>
              ) : (
                <>
                  <span className="text-landing-accent">#</span>FREELANCE
                  <br />
                  <span className="text-white/90">SERVICE</span>
                  <br />
                  <span className="text-white/80">PLATFORM</span>
                </>
              )}
            </h1>
            <p className="mt-8 text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* CTA circular badge */}
            <div className="mt-10 flex items-center justify-center">
              <button
                onClick={() => navigate('/login')}
                className="group relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-landing-accent text-landing-accent-foreground flex items-center justify-center hover:scale-105 transition-transform"
              >
                {/* Spinning text around button */}
                <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite]" viewBox="0 0 200 200">
                  <defs>
                    <path id="circlePath" d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
                  </defs>
                  <text className="text-[14px] font-bold fill-current uppercase tracking-[0.3em]">
                    <textPath href="#circlePath">
                      {lang === 'pt-BR'
                        ? '• COMECE GRÁTIS • COMECE GRÁTIS '
                        : '• GET STARTED FREE • GET STARTED FREE '}
                    </textPath>
                  </text>
                </svg>
                <ArrowUpRight className="w-8 h-8 md:w-10 md:h-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Light cards */}
      <section className="relative z-10 bg-background px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-display text-foreground text-center mb-4">
            {lang === 'pt-BR' ? 'Tudo que você precisa' : 'Everything you need'}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {lang === 'pt-BR'
              ? 'Ferramentas integradas para gerenciar seu negócio freelancer'
              : 'Integrated tools to manage your freelance business'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group glass rounded-3xl p-7 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-foreground text-xl">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-auto pt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                    {lang === 'pt-BR' ? 'Saiba mais' : 'Learn more'}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 py-8 bg-background border-t border-border">
        <span className="text-xs text-muted-foreground/50">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default LandingPage;
