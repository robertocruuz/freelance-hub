import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Users, FileText, Clock, FolderKanban, Receipt } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Tab Header with Blue Background */}
      <header className="relative z-20 tab-header-blue flex items-center justify-between px-8 pt-4 pb-5">
        <h2 className="text-2xl font-bold font-display tracking-tight text-white italic">Logo*</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition border-2 border-transparent hover:border-white/20 text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-bold text-white border-2 border-transparent hover:border-white/20"
          >
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="h-10 px-6 rounded-full bg-white text-primary font-bold text-sm hover:scale-105 transition-transform active:scale-95 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            {lang === 'pt-BR' ? 'Entrar' : 'Join Us'}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-8">
        <div className="w-full max-w-5xl">
          <div className="text-center md:text-left py-16 md:py-24">
            <motion.h1
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl md:text-8xl font-display text-foreground leading-none tracking-tight"
            >
              {lang === 'pt-BR' ? 'Plataforma de\nServiços para\nFreelancers' : 'Service Platform\nfor Freelancers'}
            </motion.h1>
            <motion.p
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-xl text-muted-foreground max-w-xl font-medium"
            >
              {t.heroSubtitle}
            </motion.p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <button
                onClick={() => navigate('/login')}
                className="mt-8 px-10 py-4 brutalist-button-primary text-xl"
              >
                {lang === 'pt-BR' ? 'Começar agora' : 'Get Started'}
              </button>
            </motion.div>
          </div>

          {/* Feature grid with framer-motion stagger */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={itemVariants}
                className="brutalist-card p-8 flex flex-col items-start gap-4 group hover:bg-[#d7ff73] transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-white group-hover:text-black transition-colors">
                  <f.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl mb-2">{f.title}</h3>
                  <p className="text-base text-muted-foreground group-hover:text-black/70 transition-colors leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 py-10 bg-black text-white">
        <span className="text-sm font-bold tracking-widest uppercase opacity-60 italic">Logo*</span>
        <span className="mx-4 text-white/20">|</span>
        <span className="text-xs font-medium uppercase tracking-widest">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default LandingPage;
