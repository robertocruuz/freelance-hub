import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt, ArrowRight, Zap } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const cards = [
    { icon: KeyRound, label: t.passwordGenerator, path: '/dashboard/passwords', color: 'bg-blue-400' },
    { icon: Users, label: t.clients, path: '/dashboard/clients', color: 'bg-secondary' },
    { icon: FolderKanban, label: t.projects, path: '/dashboard/projects', color: 'bg-accent' },
    { icon: FileText, label: t.budgets, path: '/dashboard/budgets', color: 'bg-pink-400' },
    { icon: Clock, label: t.timeTracking, path: '/dashboard/time', color: 'bg-green-400' },
    { icon: Receipt, label: t.invoices, path: '/dashboard/invoices', color: 'bg-primary' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-[12px] border-foreground pb-12">
        <div className="space-y-4">
          <h1 className="text-7xl md:text-[100px] font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.7]">
            Dashboard
          </h1>
          <p className="text-2xl font-black text-muted-foreground uppercase tracking-widest italic">{t.heroSubtitle}</p>
        </div>
        <div className="bg-secondary p-6 border-8 border-foreground shadow-brutalist-lg rotate-3 flex items-center gap-3">
          <Zap className="w-8 h-8 fill-foreground" />
          <span className="text-xl font-black uppercase tracking-tighter italic">Sistema Ativo!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {cards.map((card, idx) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className={`brutalist-card-interactive group p-0 overflow-hidden text-left flex flex-col border-4 ${idx % 2 === 0 ? 'rotate-[-1.5deg]' : 'rotate-[1.5deg]'}`}
          >
            <div className={`h-32 ${card.color} border-b-4 border-foreground flex items-center justify-center`}>
              <card.icon className="w-16 h-16 text-foreground stroke-[2.5]" />
            </div>
            <div className="p-8 flex-1 flex flex-col justify-between bg-card min-h-[160px]">
              <span className="text-3xl font-black text-foreground uppercase tracking-tighter italic leading-none mb-6">
                {card.label}
              </span>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Entrar no módulo</span>
                <div className="w-12 h-12 border-4 border-foreground rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight className="w-6 h-6 stroke-[3]" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
