import { useI18n } from '@/hooks/useI18n';
import OrgMembersCard from '@/components/OrgMembersCard';
import ReceivedInvites from '@/components/ReceivedInvites';
import { UsersRound } from 'lucide-react';

const TeamPage = () => {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
      {/* Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">
            {isPt ? 'Equipe' : 'Team'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2">
            {isPt ? 'Gerencie os membros da sua organização' : 'Manage your organization members'}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <ReceivedInvites />
        <OrgMembersCard />
      </div>
    </div>
  );
};

export default TeamPage;
