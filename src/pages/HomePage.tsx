import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HomePage = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPt = lang === 'pt-BR';
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      // Try auth metadata first
      const metaName = user?.user_metadata?.name;
      if (metaName) {
        setFirstName(metaName.split(' ')[0]);
        return;
      }
      // Fallback to profiles table
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.name) {
          setFirstName(data.name.split(' ')[0]);
        }
      }
    };
    if (user) fetchName();
  }, [user]);

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
    {
      icon: SquareKanban,
      label: isPt ? 'Kanban & Tarefas' : 'Kanban & Tasks',
      desc: isPt ? 'Gerencie tarefas em formato visual com drag & drop' : 'Manage tasks visually with drag & drop',
      path: '/dashboard/kanban',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto relative z-10">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight">
          {isPt ? `Olá, ${firstName || 'Usuário'}` : `Hello, ${firstName || 'User'}`}
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg">
          {t.heroSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="group glass rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <card.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-lg font-bold text-foreground">{card.label}</span>
                <span className="text-sm text-muted-foreground leading-snug">{card.desc}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {isPt ? 'Acessar' : 'Open'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
