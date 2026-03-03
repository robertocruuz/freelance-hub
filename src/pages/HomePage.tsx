import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

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
    },
    {
      icon: Users,
      label: isPt ? 'Meus Clientes' : 'My Clients',
      desc: isPt ? 'Gerencie seus clientes e mantenha suas informações organizadas' : 'Manage your clients and keep their info organized',
      path: '/dashboard/clients',
    },
    {
      icon: FileText,
      label: isPt ? 'Orçamentos & Propostas' : 'Budgets & Proposals',
      desc: isPt ? 'Crie e gerencie orçamentos e propostas para seus clientes' : 'Create and manage budgets and proposals for your clients',
      path: '/dashboard/budgets',
    },
    {
      icon: Clock,
      label: 'Time Tracking',
      desc: isPt ? 'Registre as horas trabalhadas e organize seu tempo por projeto' : 'Track your working hours and organize time by project',
      path: '/dashboard/time',
    },
    {
      icon: FolderKanban,
      label: isPt ? 'Projetos' : 'Projects',
      desc: isPt ? 'Organize e acompanhe seus projetos com facilidade' : 'Organize and track your projects easily',
      path: '/dashboard/projects',
    },
    {
      icon: Receipt,
      label: isPt ? 'Faturamento' : 'Invoicing',
      desc: isPt ? 'Gere faturas profissionais e acompanhe seus pagamentos' : 'Generate professional invoices and track payments',
      path: '/dashboard/invoices',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
          {isPt ? 'Plataforma de Serviços\npara Freelancers' : 'Service Platform\nfor Freelancers'}
        </h1>
        <p className="text-muted-foreground text-xl max-w-xl leading-relaxed">
          {t.heroSubtitle}
        </p>
        <button
          onClick={() => navigate('/dashboard/passwords')}
          className="mt-8 px-8 py-4 rounded-full bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
        >
          {isPt ? 'Gerencie tudo em um só lugar' : 'Manage everything in one place'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="bg-white/50 backdrop-blur-sm border border-black/5 rounded-[2rem] p-8 text-left transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1369db]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1369db] group-hover:text-white transition-all duration-300">
                <card.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xl font-bold text-foreground leading-tight">{card.label}</span>
                <span className="text-sm text-muted-foreground leading-relaxed">{card.desc}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
