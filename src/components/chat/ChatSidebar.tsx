import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Search, Plus, Hash, Users, User, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useOrganization } from '@/hooks/useOrganization';

export default function ChatSidebar({ chatState, isMobile }: any) {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';
  const { user } = useAuth();
  const { members, orgId, orgProfile } = useOrganization();
  const { channels, activeChannelId, setActiveChannelId, createDirectChannel, createTeamChannel } = chatState;
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredChannels = channels.filter((c: any) => {
    // If it's a team chat, filter by channel name
    if (c.type !== 'direct' && c.name) {
      return c.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    // If it's a direct chat, find the other member's name
    if (c.type === 'direct') {
      const otherMember = c.channel_members?.find((m: any) => m.user_id !== user?.id);
      const otherName = otherMember?.profiles?.name || 'User';
      return otherName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const getChannelDisplayInfo = (c: any) => {
    if (c.type === 'direct') {
      const otherMember = c.channel_members?.find((m: any) => m.user_id !== user?.id);
      return {
        name: otherMember?.profiles?.name || 'Unknown User',
        avatar: otherMember?.profiles?.avatar_url,
        icon: User,
        initials: (otherMember?.profiles?.name || '?').substring(0, 2).toUpperCase()
      };
    }
    if (c.type === 'team') {
      const orgName = orgProfile?.name || (isPt ? 'Equipe' : 'Team');
      const channelName = c.name === 'Equipe Geral' && orgName ? orgName : (c.name || orgName);
      return {
        name: channelName,
        icon: Users,
        initials: (orgProfile?.name || 'EQ').substring(0, 2).toUpperCase(),
        avatar: orgProfile?.logo || ''
      };
    }
    return {
      name: c.name || (isPt ? 'Projeto' : 'Project'),
      icon: Hash,
      initials: 'PR'
    };
  };

  const selectableUsers = members.filter(m => m.user_id !== user?.id && m.profile);

  const handleCreateDirectChat = async (otherUserId: string) => {
    setIsDialogOpen(false);
    await createDirectChannel(otherUserId);
  };

  return (
    <div className="flex flex-col w-full h-full bg-card/30">
      <div className="p-4 border-b border-border space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isPt ? 'Conversas' : 'Chats'}</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isPt ? 'Nova Conversa' : 'New Chat'}</DialogTitle>
                <DialogDescription>
                  {isPt ? 'Selecione um membro ou crie um canal para toda a equipe.' : 'Select a member or create a team channel.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2 mt-4 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={async () => {
                    setIsDialogOpen(false);
                    if (orgId) {
                      await createTeamChannel(orgId, orgProfile?.name || 'Equipe Geral');
                    }
                  }}
                >
                  <Users className="h-4 w-4" />
                  {isPt ? 'Criar Chat da Equipe (Geral)' : 'Create Team Chat (General)'}
                </Button>
                
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-semibold"><span className="bg-card px-2 text-muted-foreground">{isPt ? 'Membros Diretos' : 'Direct Members'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {selectableUsers.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    {isPt ? 'Nenhum outro membro na equipe.' : 'No other members in the team.'}
                  </p>
                ) : (
                  selectableUsers.map(member => (
                    <button
                      key={member.user_id}
                      onClick={() => handleCreateDirectChat(member.user_id)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback>{(member.profile?.name || member.profile?.email || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{member.profile?.name || 'Usuário'}</span>
                        <span className="text-xs text-muted-foreground truncate">{member.profile?.email}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={isPt ? 'Buscar...' : 'Search...'} 
            className="pl-9 bg-background/50 border-none focus-visible:ring-1" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="text-center text-muted-foreground p-4 text-sm">
              {isPt ? 'Nenhuma conversa encontrada.' : 'No chats found.'}
            </div>
          ) : (
            filteredChannels.map((channel: any) => {
              const info = getChannelDisplayInfo(channel);
              const myMember = channel.channel_members?.find((m: any) => m.user_id === user?.id);
              const isActive = activeChannelId === channel.id;
              
              let updatedDateStr = channel.updated_at || new Date().toISOString();
              if (!updatedDateStr.endsWith('Z') && !/([+-][0-9]{2}:?[0-9]{2})$/.test(updatedDateStr)) {
                updatedDateStr += 'Z';
              }
              const updatedDate = new Date(updatedDateStr);
              
              const isUnread = myMember && channel.updated_at > (myMember.last_read_at || '1970-01-01');
              const unreadCount = channel.unread_count || 0;

              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={info.avatar || ''} />
                      <AvatarFallback className={isActive ? 'bg-primary/20 text-primary font-medium' : 'bg-muted text-muted-foreground font-medium'}>
                        {info.initials}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate ${isActive || isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {info.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(updatedDate, { addSuffix: true, locale: isPt ? ptBR : enUS })}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-primary/70' : 'text-muted-foreground'}`}>
                      {channel.type === 'direct' 
                        ? (isPt ? 'Mensagem direta' : 'Direct message') 
                        : (channel.type === 'team' ? (isPt ? 'Canal da Equipe' : 'Team Channel') : (isPt ? 'Canal do Projeto' : 'Project Channel'))}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
