import { useI18n } from '@/hooks/useI18n';
import OrgMembersCard from '@/components/OrgMembersCard';
import ReceivedInvites from '@/components/ReceivedInvites';
import { UsersRound } from 'lucide-react';

const TeamPage = () => {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {isPt ? 'Equipe' : 'Team'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt ? 'Gerencie os membros da sua organização' : 'Manage your organization members'}
        </p>
      </div>

      <div className="space-y-6">
        <ReceivedInvites />
        <OrgMembersCard />
      </div>
    </div>
  );
};

export default TeamPage;
