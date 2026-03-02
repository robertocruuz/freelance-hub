import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt, ArrowRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isPt = lang === 'pt-BR';

  const cards = [
    {
      icon: KeyRound,
      label: isPt ? 'Senha & Cofre' : 'Passwords & Vault',
      desc: isPt ? 'Gere e armazene senhas com segurança' : 'Generate and store passwords securely',
      path: '/dashboard/passwords',
      color: 'bg-[#d7ff73]',
    },
    {
      icon: Users,
      label: isPt ? 'Meus Clientes' : 'My Clients',
      desc: isPt ? 'Gerencie seus clientes e mantenha suas informações organizadas' : 'Manage your clients and keep their info organized',
      path: '/dashboard/clients',
      color: 'bg-primary text-white',
    },
    {
      icon: FolderKanban,
      label: isPt ? 'Projetos' : 'Projects',
      desc: isPt ? 'Organize e acompanhe seus projetos com facilidade' : 'Organize and track your projects easily',
      path: '/dashboard/projects',
      color: 'bg-white',
    },
    {
      icon: Clock,
      label: 'Time Tracking',
      desc: isPt ? 'Registre as horas trabalhadas e organize seu tempo por projeto' : 'Track your working hours and organize time by project',
      path: '/dashboard/time',
      color: 'bg-white',
    },
    {
      icon: FileText,
      label: isPt ? 'Orçamentos & Propostas' : 'Budgets & Proposals',
      desc: isPt ? 'Crie e gerencie orçamentos e propostas para seus clientes' : 'Create and manage budgets and proposals for your clients',
      path: '/dashboard/budgets',
      color: 'bg-white',
    },
    {
      icon: Receipt,
      label: isPt ? 'Faturamento' : 'Invoicing',
      desc: isPt ? 'Gere faturas profissionais e acompanhe seus pagamentos' : 'Generate professional invoices and track payments',
      path: '/dashboard/invoices',
      color: 'bg-white',
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
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-16">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-display font-black italic text-foreground mb-6 leading-none tracking-tight whitespace-pre-line"
        >
          {isPt ? 'Painel de Controle\nFreelancer' : 'Freelancer\nDashboard'}
        </motion.h1>
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-xl max-w-xl font-medium"
        >
          {t.heroSubtitle}
        </motion.p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {cards.map((card) => (
          <motion.button
            key={card.path}
            variants={itemVariants}
            onClick={() => navigate(card.path)}
            className={`brutalist-card p-8 text-left transition-all group ${card.color} hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}
          >
            <div className="flex flex-col h-full justify-between gap-8 relative z-10">
              <div className="w-14 h-14 rounded-xl border-2 border-black bg-white flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#d7ff73] transition-colors">
                <card.icon className="w-7 h-7 text-black" />
              </div>
              <div className="space-y-2">
                <span className="text-2xl font-black font-display uppercase italic tracking-tight block leading-none">
                  {card.label}
                </span>
                <span className="text-sm font-bold opacity-70 leading-snug block">
                  {card.desc}
                </span>
              </div>
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest pt-4 border-t-2 border-black/5 group-hover:border-black/10 transition-colors">
                ACESSAR <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            {/* Background pattern decoration */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-black/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default HomePage;
