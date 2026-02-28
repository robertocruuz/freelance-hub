import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FolderKanban, FileText, Clock, Receipt } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const cards = [
    { icon: KeyRound, label: t.passwordGenerator, path: '/dashboard/passwords', gradient: 'from-violet-500/20 to-purple-500/20' },
    { icon: Users, label: t.clients, path: '/dashboard/clients', gradient: 'from-blue-500/20 to-cyan-500/20' },
    { icon: FolderKanban, label: t.projects, path: '/dashboard/projects', gradient: 'from-emerald-500/20 to-teal-500/20' },
    { icon: FileText, label: t.budgets, path: '/dashboard/budgets', gradient: 'from-amber-500/20 to-orange-500/20' },
    { icon: Clock, label: t.timeTracking, path: '/dashboard/time', gradient: 'from-rose-500/20 to-pink-500/20' },
    { icon: Receipt, label: t.invoices, path: '/dashboard/invoices', gradient: 'from-indigo-500/20 to-blue-500/20' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-foreground mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">{t.heroSubtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className={`glass group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <card.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">{card.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
