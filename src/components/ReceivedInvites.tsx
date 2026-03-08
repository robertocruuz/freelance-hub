import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Mail, Check, X, Building2, Crown, Pencil, Eye, Clock } from 'lucide-react';

interface ReceivedInvite {
  id: string;
  organization_id: string;
  email: string | null;
  invite_token: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  created_at: string;
  expires_at: string;
  org_name?: string;
}

const roleIcons = { admin: Crown, editor: Pencil, viewer: Eye };
const roleLabels: Record<string, Record<string, string>> = {
  admin: { 'pt-BR': 'Admin', en: 'Admin' },
  editor: { 'pt-BR': 'Editor', en: 'Editor' },
  viewer: { 'pt-BR': 'Visualizador', en: 'Viewer' },
};

const ReceivedInvites = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  const { acceptInvite, refresh } = useOrganization();
  const [invites, setInvites] = useState<ReceivedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isPt = lang === 'pt-BR';

  useEffect(() => {
    if (!user?.email) return;

    const fetchReceivedInvites = async () => {
      setLoading(true);

      // Get pending invites for this user's email
      const { data: inviteData } = await (supabase.from('organization_invites' as any) as any)
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inviteData && inviteData.length > 0) {
        // Fetch org names
        const orgIds = [...new Set((inviteData as any[]).map((i: any) => i.organization_id))];
        const { data: orgs } = await (supabase.from('organizations' as any) as any)
          .select('id, company_name, trade_name')
          .in('id', orgIds);

        const invitesWithOrgs = (inviteData as any[]).map((inv: any) => {
          const org = orgs?.find((o: any) => o.id === inv.organization_id);
          return {
            ...inv,
            org_name: org?.trade_name || org?.company_name || (isPt ? 'Organização' : 'Organization'),
          };
        });

        setInvites(invitesWithOrgs);
      } else {
        setInvites([]);
      }
      setLoading(false);
    };

    fetchReceivedInvites();
  }, [user, isPt]);

  const handleAccept = async (invite: ReceivedInvite) => {
    setActionLoading(invite.id);
    const { error } = await acceptInvite(invite.invite_token);
    setActionLoading(null);

    if (error) {
      toast({ title: isPt ? 'Erro ao aceitar convite' : 'Error accepting invite', variant: 'destructive' });
    } else {
      toast({ title: isPt ? 'Convite aceito!' : 'Invite accepted!' });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      refresh();
    }
  };

  const handleDecline = async (invite: ReceivedInvite) => {
    setActionLoading(invite.id);
    // Update invite status to declined
    await (supabase.from('organization_invites' as any) as any)
      .update({ status: 'declined' })
      .eq('id', invite.id);

    // Also remove pending member entry if exists
    await (supabase.from('organization_members' as any) as any)
      .delete()
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user!.id)
      .eq('status', 'pending');

    setActionLoading(null);
    toast({ title: isPt ? 'Convite recusado' : 'Invite declined' });
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  if (loading || invites.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          {isPt ? 'Convites recebidos' : 'Received invites'}
        </p>

        <div className="space-y-2">
          {invites.map((invite) => {
            const RoleIcon = roleIcons[invite.role] || Eye;
            const isExpired = new Date(invite.expires_at) < new Date();
            const isLoading = actionLoading === invite.id;

            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/[0.03]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {invite.org_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                      <RoleIcon className="w-3 h-3" />
                      {roleLabels[invite.role]?.[lang] || invite.role}
                    </Badge>
                    {isExpired ? (
                      <span className="text-[10px] text-destructive font-medium">
                        {isPt ? 'Expirado' : 'Expired'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isPt ? 'Expira em' : 'Expires'} {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isExpired && (
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invite)}
                      disabled={isLoading}
                      className="gap-1.5 h-8"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isPt ? 'Aceitar' : 'Accept'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDecline(invite)}
                    disabled={isLoading}
                    className="gap-1.5 h-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                    {isPt ? 'Recusar' : 'Decline'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Separator className="opacity-50" />
    </>
  );
};

export default ReceivedInvites;
