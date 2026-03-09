import { useState, useEffect } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization, OrgMember, OrgInvite } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Mail, Link2, Copy, Trash2, Shield, Pencil, Eye, Crown, Clock, MoreVertical, LogOut } from 'lucide-react';

const roleIcons = {
  admin: Crown,
  collaborator: Pencil,
};

const roleColors = {
  admin: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  collaborator: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const OrgMembersCard = ({ embedded = false, orgHook: externalOrgHook, onLeave }: { embedded?: boolean; orgHook?: ReturnType<typeof useOrganization>; onLeave?: () => void }) => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  
  const internalOrgHook = useOrganization();
  const { orgId, ownerId, members, invites, loading, isAdmin, inviteByEmail, generateInviteLink, updateMemberRole, removeMember, cancelInvite, leaveOrganization } = externalOrgHook || internalOrgHook;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'collaborator'>('collaborator');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const isPt = lang === 'pt-BR';

  const roleLabel = (role: string) => {
    const labels: Record<string, Record<string, string>> = {
      admin: { 'pt-BR': 'Admin', en: 'Admin' },
      collaborator: { 'pt-BR': 'Colaborador', en: 'Collaborator' },
    };
    return labels[role]?.[lang] || role;
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const { error } = await inviteByEmail(inviteEmail.trim(), inviteRole);
    setInviteLoading(false);
    if (error) {
      toast({ title: isPt ? 'Erro ao convidar' : 'Error inviting', variant: 'destructive' });
    } else {
      toast({ title: isPt ? 'Convite enviado!' : 'Invite sent!' });
      setInviteEmail('');
      setInviteOpen(false);
    }
  };

  // Auto-generate invite link on mount
  useEffect(() => {
    if (isAdmin && orgId && !inviteLink) {
      (async () => {
        const { token } = await generateInviteLink('collaborator');
        if (token) {
          setInviteLink(`${window.location.origin}/invite/${token}`);
        }
      })();
    }
  }, [isAdmin, orgId]);

  const handleGenerateLink = async () => {
    setInviteLoading(true);
    const { token, error } = await generateInviteLink(inviteRole);
    setInviteLoading(false);
    if (error || !token) {
      toast({ title: isPt ? 'Erro ao gerar link' : 'Error generating link', variant: 'destructive' });
    } else {
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: isPt ? 'Link copiado!' : 'Link copied!' });
    }
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'collaborator') => {
    const { error } = await updateMemberRole(memberId, role);
    if (error) {
      toast({ title: isPt ? 'Erro ao atualizar' : 'Error updating', variant: 'destructive' });
    } else {
      toast({ title: isPt ? 'Permissão atualizada!' : 'Role updated!' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await removeMember(memberId);
    if (error) {
      toast({ title: isPt ? 'Erro ao remover' : 'Error removing', variant: 'destructive' });
    } else {
      toast({ title: isPt ? 'Membro removido!' : 'Member removed!' });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await cancelInvite(inviteId);
    if (error) {
      toast({ title: isPt ? 'Erro ao cancelar' : 'Error canceling', variant: 'destructive' });
    }
  };
  const handleLeaveOrganization = async () => {
    const { error } = await leaveOrganization();
    if (error) {
      toast({ title: isPt ? 'Erro ao sair da equipe' : 'Error leaving team', variant: 'destructive' });
    } else {
      toast({ title: isPt ? 'Você saiu da equipe' : 'You left the team' });
      onLeave?.();
    }
    setLeaveDialogOpen(false);
  };

  if (!orgId && !loading) {
    if (embedded) {
      return (
        <div className="text-sm text-muted-foreground py-2">
          {isPt ? 'Cadastre uma organização primeiro para convidar membros' : 'Register an organization first to invite members'}
        </div>
      );
    }
    return (
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Equipe' : 'Team'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Cadastre uma organização primeiro para convidar membros' : 'Register an organization first to invite members'}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    const str = name || email || '?';
    return str.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const teamContent = (
    <>
      {/* Invite link section */}
      {isAdmin && (
        <div className="space-y-3">
          {/* Invite by email */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {isPt ? 'Convidar por e-mail' : 'Invite by email'}
            </Label>
            <div className="flex gap-2">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="collaborator">{isPt ? 'Colaborador' : 'Collaborator'}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteByEmail()}
                className="flex-1"
              />
              <Button onClick={handleInviteByEmail} disabled={inviteLoading || !inviteEmail.trim()} size="sm" className="gap-1.5 shrink-0">
                <UserPlus className="w-3.5 h-3.5" />
                {isPt ? 'Enviar' : 'Send'}
              </Button>
            </div>
          </div>

          {/* Invite link */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              {isPt ? 'Link de convite' : 'Invite link'}
            </Label>
            <div className="flex gap-2">
              <Input value={inviteLink || (isPt ? 'Gerando...' : 'Generating...')} readOnly className="text-xs bg-muted/30" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopyLink} disabled={!inviteLink}>
                <Copy className="w-3.5 h-3.5" />
                {isPt ? 'Copiar' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPt ? 'O link expira em 7 dias' : 'Link expires in 7 days'}
            </p>
          </div>
          <Separator className="opacity-50" />
        </div>
      )}

      {/* Members list */}
        <div className="space-y-2">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role] || Eye;
            const isCurrentUser = member.user_id === user?.id;
            const isOwner = member.user_id === ownerId;
            const canManage = isAdmin && !isCurrentUser && !isOwner;

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-9 h-9 shrink-0">
                  {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(member.profile?.name, member.profile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.profile?.name || member.profile?.email || member.user_id.slice(0, 8)}
                    {isOwner && <span className="text-xs text-primary ml-1.5">({isPt ? 'proprietário' : 'owner'})</span>}
                    {isCurrentUser && !isOwner && <span className="text-xs text-muted-foreground ml-1.5">({isPt ? 'você' : 'you'})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile?.email || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {member.status === 'pending' && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Clock className="w-3 h-3" />
                      {isPt ? 'Pendente' : 'Pending'}
                    </Badge>
                  )}
                  {canManage ? (
                    <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v as any)}>
                      <SelectTrigger className="h-7 text-xs w-auto gap-1 px-2">
                        <RoleIcon className="w-3 h-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="collaborator">{isPt ? 'Colaborador' : 'Collaborator'}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-[10px] gap-1 ${roleColors[member.role]}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleLabel(member.role)}
                    </Badge>
                  )}
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isPt ? 'Remover membro?' : 'Remove member?'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isPt
                              ? 'Este membro perderá acesso aos dados da organização.'
                              : 'This member will lose access to organization data.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{isPt ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPt ? 'Remover' : 'Remove'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {isCurrentUser && !isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive gap-2"
                          onClick={() => setLeaveDialogOpen(true)}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {isPt ? 'Sair da equipe' : 'Leave team'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending invites */}
        {isAdmin && invites.length > 0 && (
          <>
            <Separator className="opacity-50" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {isPt ? 'Convites pendentes' : 'Pending invites'}
              </p>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/20 border border-dashed border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {invite.email || (isPt ? 'Link de convite' : 'Invite link')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel(invite.role)} · {isPt ? 'Expira em' : 'Expires'} {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {/* Leave team confirmation dialog */}
        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isPt ? 'Sair da equipe?' : 'Leave team?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {isPt
                  ? 'Você perderá acesso aos dados compartilhados da organização. Esta ação não pode ser desfeita.'
                  : 'You will lose access to shared organization data. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isPt ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveOrganization} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isPt ? 'Sair' : 'Leave'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{teamContent}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Equipe' : 'Team'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Gerencie os membros da sua organização' : 'Manage your organization members'}
            </CardDescription>
          </div>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) { setInviteLink(null); setInviteEmail(''); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shrink-0">
                <UserPlus className="w-3.5 h-3.5" />
                {isPt ? 'Convidar' : 'Invite'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isPt ? 'Convidar membro' : 'Invite member'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">{isPt ? 'Permissão' : 'Role'}</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin"><span className="flex items-center gap-2"><Crown className="w-3.5 h-3.5" /> Admin</span></SelectItem>
                      <SelectItem value="editor"><span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Editor</span></SelectItem>
                      <SelectItem value="viewer"><span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> {isPt ? 'Visualizador' : 'Viewer'}</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{isPt ? 'Convidar por e-mail' : 'Invite by email'}</Label>
                  <div className="flex gap-2">
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" onKeyDown={(e) => e.key === 'Enter' && handleInviteByEmail()} />
                    <Button onClick={handleInviteByEmail} disabled={inviteLoading || !inviteEmail.trim()} size="sm">{isPt ? 'Enviar' : 'Send'}</Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 pb-6 space-y-4">
        {teamContent}
      </CardContent>
    </Card>
  );
};

export default OrgMembersCard;
