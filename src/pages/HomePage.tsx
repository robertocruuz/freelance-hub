import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt, ArrowRight } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-6xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            Dashboard
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">{t.heroSubtitle}</p>
        </div>
        <div className="bg-secondary p-4 border-4 border-foreground shadow-brutalist hidden md:block rotate-2">
          <span className="text-sm font-black uppercase tracking-tighter italic">Bem-vindo de volta!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card, idx) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className={`brutalist-card group p-0 overflow-hidden text-left flex flex-col ${idx % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]'}`}
          >
            <div className={`h-24 ${card.color} border-b-4 border-foreground flex items-center justify-center`}>
              <card.icon className="w-12 h-12 text-foreground stroke-[2.5]" />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between bg-card">
              <span className="text-2xl font-black text-foreground uppercase tracking-tighter italic leading-none mb-4">
                {card.label}
              </span>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Acessar área</span>
                <div className="w-10 h-10 border-2 border-foreground rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight className="w-5 h-5" />
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
