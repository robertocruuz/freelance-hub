import { useState, useEffect } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization, OrgMember, OrgInvite } from '@/hooks/useOrganization';
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
import { Users, UserPlus, Mail, Link2, Copy, Trash2, Shield, Pencil, Eye, Crown, Clock, MoreVertical, LogOut, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
  const internalOrgHook = useOrganization();
  const { orgId, ownerId, orgProfile, members, invites, loading, isAdmin, inviteByEmail, generateInviteLink, updateMemberRole, removeMember, cancelInvite, leaveOrganization } = externalOrgHook || internalOrgHook;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'collaborator'>('collaborator');
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
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {isPt ? 'Você não possui uma equipe.' : 'You do not have a team.'}
          </p>
          <Button onClick={() => navigate('/dashboard/profile?openOrg=true')} size="sm" className="gap-2">
            <Building2 className="w-4 h-4" />
            {isPt ? 'Criar Equipe' : 'Create Team'}
          </Button>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm flex flex-col">
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5 shadow-sm">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-extrabold mb-2 text-foreground">
            {isPt ? 'Você não possui uma equipe' : 'You do not have a team'}
          </h3>
          <p className="text-sm font-medium text-muted-foreground max-w-sm mb-8">
            {isPt 
              ? 'Cadastre as informações da sua organização para poder convidar e gerenciar novos membros.' 
              : 'Register your organization info to invite and manage new members.'}
          </p>
          <Button onClick={() => navigate('/dashboard/profile?openOrg=true')} className="gap-2 h-11 px-6 rounded-full font-bold shadow-md">
            <Building2 className="w-5 h-5" />
            {isPt ? 'Criar Equipe' : 'Create Team'}
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    const str = name || email || '?';
    return str.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const teamContent = (
    <>
      {/* Invite link section */}
      {/* Excluded: the inline invite form was removed to avoid redundancy with the "Invite Member" modal. */}

      {/* Members list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-2">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role] || Eye;
            const isCurrentUser = member.user_id === user?.id;
            const isOwner = member.user_id === ownerId;
            const canManage = isAdmin && !isCurrentUser && !isOwner;

            return (
              <div
                key={member.id}
                className="group flex flex-col gap-4 p-5 rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all relative isolate"
              >
                <div className="flex justify-between items-start w-full">
                  <Avatar className="w-12 h-12 shrink-0 ring-4 ring-background shadow-sm transition-all overflow-hidden bg-primary/10">
                    {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} className="object-cover w-full h-full" />}
                    <AvatarFallback className="bg-transparent text-primary text-base font-extrabold flex items-center justify-center">
                      {getInitials(member.profile?.name, member.profile?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {canManage ? (
                      <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v as any)}>
                        <SelectTrigger className="h-7 text-[10px] w-auto gap-1.5 px-2.5 rounded-[8px] font-semibold border-border/50 bg-card shadow-sm hover:bg-muted/50 transition-colors">
                          <RoleIcon className="w-3 h-3 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin" className="font-semibold text-xs">Admin</SelectItem>
                          <SelectItem value="collaborator" className="font-semibold text-xs">{isPt ? 'Colaborador' : 'Collaborator'}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-[8px] border shadow-sm gap-1.5 font-bold ${roleColors[member.role]}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleLabel(member.role)}
                      </Badge>
                    )}
                    {member.status === 'pending' && (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 px-2 py-0.5 rounded-[8px]">
                        <Clock className="w-3 h-3" />
                        {isPt ? 'Pendente' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col min-w-0 mt-1">
                  <p className="text-base font-extrabold text-foreground truncate flex items-center gap-2">
                    {member.profile?.name || member.profile?.email || member.user_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {member.profile?.email || ''}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {isOwner && <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-[8px] bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">Proprietário</span>}
                    {isCurrentUser && !isOwner && <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[8px] bg-muted text-muted-foreground border border-border">Você</span>}
                  </div>
                </div>

                {/* Actions at the bottom right */}
                {(canManage || (isCurrentUser && !isOwner)) && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManage && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{isPt ? 'Remover membro?' : 'Remove member?'}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {isPt
                                ? 'Este membro perderá acesso aos dados da organização.'
                                : 'This member will lose access to organization data.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">{isPt ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {isPt ? 'Remover' : 'Remove'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {isCurrentUser && !isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive gap-2 font-semibold cursor-pointer"
                            onClick={() => setLeaveDialogOpen(true)}
                          >
                            <LogOut className="w-4 h-4" />
                            {isPt ? 'Sair da equipe' : 'Leave team'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending invites */}
        {isAdmin && invites.length > 0 && (
          <>
            <Separator className="opacity-50 my-2 mx-4" />
            <div className="px-2 pb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2 flex items-center gap-1.5 mt-2">
                <Mail className="w-3.5 h-3.5" />
                {isPt ? 'Convites pendentes' : 'Pending invites'}
              </p>
              <div className="flex flex-col">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {invite.email || (isPt ? 'Link de convite' : 'Invite link')}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {roleLabel(invite.role)} · {isPt ? 'Expira em' : 'Expires'} {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      <Trash2 className="w-4 h-4" />
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {orgProfile?.logo ? (
            <div className="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center shrink-0 overflow-hidden bg-white border border-border">
              <img src={orgProfile.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]">
              <Users className="w-5 h-5 text-primary" />
            </div>
          )}
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            {orgProfile?.name || (isPt ? 'Membros da Organização' : 'Organization Members')}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) { setInviteEmail(''); } }}>
              <DialogTrigger asChild>
              <Button className="gap-1.5 h-8 px-3 rounded-[10px] font-semibold shadow-sm text-xs shrink-0">
                <UserPlus className="w-3.5 h-3.5" />
                {isPt ? 'Convidar Membro' : 'Invite Member'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isPt ? 'Convidar membro' : 'Invite member'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{isPt ? 'Permissão' : 'Role'}</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin"><span className="flex items-center gap-2 font-semibold"><Crown className="w-4 h-4 text-amber-500" /> Admin</span></SelectItem>
                      <SelectItem value="collaborator"><span className="flex items-center gap-2 font-semibold"><Pencil className="w-4 h-4 text-blue-500" /> {isPt ? 'Colaborador' : 'Collaborator'}</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4 text-muted-foreground" />{isPt ? 'Convidar por e-mail' : 'Invite by email'}</Label>
                  <div className="flex gap-2">
                    <Input className="h-10 rounded-xl" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" onKeyDown={(e) => e.key === 'Enter' && handleInviteByEmail()} />
                    <Button onClick={handleInviteByEmail} disabled={inviteLoading || !inviteEmail.trim()} className="h-10 px-5 rounded-xl font-bold">{isPt ? 'Enviar' : 'Send'}</Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>
      <div className="w-full">
        {teamContent}
      </div>
    </div>
  );
};

export default OrgMembersCard;
