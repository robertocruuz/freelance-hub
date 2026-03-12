import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Share2, Users, UserPlus, X, Building2, Globe, Mail, Loader2 } from 'lucide-react';

interface ShareButtonProps {
  resourceType: 'board' | 'task' | 'pipeline';
  resourceId: string;
  compact?: boolean;
}

interface ShareRecord {
  id: string;
  share_type: string;
  shared_with_user_id: string | null;
  profile?: { name: string | null; email: string | null; avatar_url: string | null };
}

export const ShareButton = ({ resourceType, resourceId, compact = false }: ShareButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [orgMembers, setOrgMembers] = useState<{ user_id: string; name: string | null; email: string | null; avatar_url: string | null }[]>([]);
  const [hasOrg, setHasOrg] = useState(false);
  const [sharedWithOrg, setSharedWithOrg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadShares = async () => {
    if (!user) return;
    const { data } = await (supabase.from('shares' as any) as any)
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (data) {
      const userShares = (data as any[]).filter(s => s.share_type === 'user' && s.shared_with_user_id);
      const userIds = userShares.map(s => s.shared_with_user_id);

      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('user_id, name, email, avatar_url').in('user_id', userIds);
        profiles = p || [];
      }

      const sharesWithProfiles = (data as any[]).map(s => ({
        ...s,
        profile: profiles.find(p => p.user_id === s.shared_with_user_id) || null,
      }));

      setShares(sharesWithProfiles);
      setSharedWithOrg(sharesWithProfiles.some(s => s.share_type === 'org'));
    }
  };

  const loadOrgMembers = async () => {
    if (!user) return;
    // Get user's org
    const { data: membership } = await (supabase.from('organization_members' as any) as any)
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (membership) {
      setHasOrg(true);
      const { data: members } = await (supabase.from('organization_members' as any) as any)
        .select('user_id')
        .eq('organization_id', (membership as any).organization_id)
        .eq('status', 'accepted')
        .neq('user_id', user.id);

      if (members) {
        const userIds = (members as any[]).map(m => m.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('user_id, name, email, avatar_url').in('user_id', userIds);
          setOrgMembers((profiles || []).map(p => ({ user_id: p.user_id, name: p.name, email: p.email, avatar_url: p.avatar_url })));
        }
      }
    }
  };

  // Preload shares whenever resourceId changes (even when closed)
  useEffect(() => {
    loadShares();
  }, [resourceId]);

  useEffect(() => {
    if (open) {
      loadShares();
      loadOrgMembers();
    }
  }, [open]);

  const toggleOrgShare = async () => {
    if (!user) return;
    setLoading(true);
    if (sharedWithOrg) {
      // Remove org share
      await (supabase.from('shares' as any) as any)
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('share_type', 'org');
      setSharedWithOrg(false);
      toast({ title: 'Compartilhamento com organização removido' });
    } else {
      // Add org share
      await (supabase.from('shares' as any) as any)
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          share_type: 'org',
          created_by: user.id,
        });
      setSharedWithOrg(true);
      toast({ title: 'Compartilhado com a organização' });
    }
    setLoading(false);
    loadShares();
  };

  const shareWithUser = async (userId: string) => {
    if (!user) return;
    setLoading(true);
    await (supabase.from('shares' as any) as any)
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        share_type: 'user',
        shared_with_user_id: userId,
        created_by: user.id,
      });
    toast({ title: 'Compartilhado com sucesso' });
    setLoading(false);
    setSearchEmail('');
    loadShares();
  };

  const removeUserShare = async (shareId: string) => {
    setLoading(true);
    await (supabase.from('shares' as any) as any).delete().eq('id', shareId);
    setLoading(false);
    loadShares();
  };

  const inviteByEmail = async () => {
    if (!user || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    if (email === user.email?.toLowerCase()) {
      toast({ title: 'Você não pode compartilhar consigo mesmo', variant: 'destructive' });
      return;
    }
    setInviteLoading(true);
    // Find user by email in profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .eq('email', email)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      toast({ title: 'Usuário não encontrado', description: 'Nenhum usuário cadastrado com esse email.', variant: 'destructive' });
      setInviteLoading(false);
      return;
    }

    const targetUserId = profiles[0].user_id;
    // Check if already shared
    if (shares.some(s => s.share_type === 'user' && s.shared_with_user_id === targetUserId)) {
      toast({ title: 'Já compartilhado', description: 'Este recurso já está compartilhado com esse usuário.', variant: 'destructive' });
      setInviteLoading(false);
      return;
    }

    await shareWithUser(targetUserId);
    setInviteEmail('');
    setInviteLoading(false);
  };

  const userShares = shares.filter(s => s.share_type === 'user');
  const sharedUserIds = new Set(userShares.map(s => s.shared_with_user_id));
  const availableMembers = orgMembers.filter(m => !sharedUserIds.has(m.user_id));
  const filteredMembers = searchEmail
    ? availableMembers.filter(m =>
        (m.name?.toLowerCase().includes(searchEmail.toLowerCase()) || m.email?.toLowerCase().includes(searchEmail.toLowerCase()))
      )
    : availableMembers;

  const shareCount = shares.length;
  const getInitials = (name?: string | null, email?: string | null) => {
    const str = name || email || '?';
    return str.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition p-1 rounded">
            <Share2 className="w-3.5 h-3.5" />
            {shareCount > 0 && <span className="text-[10px]">{shareCount}</span>}
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
            {shareCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{shareCount}</Badge>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Share2 className="w-4 h-4" />
            Compartilhar {resourceType === 'board' ? 'painel' : resourceType === 'pipeline' ? 'pipeline' : 'tarefa'}
          </h4>
        </div>

        <div className="p-3 space-y-3">
          {/* Share with org */}
          {hasOrg && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Organização</p>
                  <p className="text-[10px] text-muted-foreground">Todos os membros</p>
                </div>
              </div>
              <Switch
                checked={sharedWithOrg}
                onCheckedChange={toggleOrgShare}
                disabled={loading}
              />
            </div>
          )}

          {/* Share with specific user */}
          {hasOrg && availableMembers.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <UserPlus className="w-3.5 h-3.5" />
                  Compartilhar com membro
                </Label>
                {availableMembers.length > 3 && (
                  <Input
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="h-8 text-xs mb-2"
                  />
                )}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => shareWithUser(member.user_id)}
                      disabled={loading}
                      className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-muted/50 transition text-left"
                    >
                      <Avatar className="w-6 h-6">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{member.name || member.email}</p>
                        {member.name && <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>}
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Invite by email */}
          <Separator className="opacity-50" />
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <Mail className="w-3.5 h-3.5" />
              Convidar por email
            </Label>
            <div className="flex gap-1.5">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteByEmail()}
                placeholder="email@exemplo.com"
                type="email"
                className="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                onClick={inviteByEmail}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="h-8 px-2.5 text-xs"
              >
                {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Current shares */}
          {userShares.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Users className="w-3.5 h-3.5" />
                  Compartilhado com
                </Label>
                <div className="space-y-1">
                  {userShares.map((share) => (
                    <div key={share.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20">
                      <Avatar className="w-6 h-6">
                        {share.profile?.avatar_url && <AvatarImage src={share.profile.avatar_url} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {getInitials(share.profile?.name, share.profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{share.profile?.name || share.profile?.email || 'Usuário'}</p>
                      </div>
                      <button
                        onClick={() => removeUserShare(share.id)}
                        className="text-destructive/70 hover:text-destructive p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
