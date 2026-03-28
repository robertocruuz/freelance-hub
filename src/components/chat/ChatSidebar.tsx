import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Search, Plus, Hash, Users, User, Clock, ChevronDown, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { channels, activeChannelId, setActiveChannelId, createDirectChannel, createTeamChannel, deleteChannel } = chatState;
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentUserMember = members.find((m: any) => m.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';
  const hasTeamChannel = channels.some((c: any) => c.type === 'team');

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

  const handleCreateDirectChat = (otherUserId: string, profile: any) => {
    setIsDialogOpen(false);
    chatState.initDirectChat(otherUserId, profile);
  };

  return (
    <div className="flex flex-col w-full h-full bg-card/30 dark:bg-background">
      <div className="p-4 border-b border-border space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isPt ? 'Conversas' : 'Chats'}</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">
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
                  disabled={hasTeamChannel}
                  className={`w-full justify-start gap-2 transition-colors ${
                    hasTeamChannel 
                      ? 'border-muted bg-muted/50 text-muted-foreground opacity-60' 
                      : 'text-primary border-primary/20 bg-primary/5 hover:bg-primary/10'
                  }`}
                  onClick={async () => {
                    if (hasTeamChannel) return;
                    setIsDialogOpen(false);
                    if (orgId) {
                      await createTeamChannel(orgId, orgProfile?.name || 'Equipe Geral');
                    }
                  }}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {isPt 
                      ? (hasTeamChannel ? 'Chat Geral Já Existente' : 'Criar Chat da Equipe (Geral)') 
                      : (hasTeamChannel ? 'General Chat Exists' : 'Create Team Chat (General)')}
                  </span>
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
                      onClick={() => handleCreateDirectChat(member.user_id, member.profile)}
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
                <div key={channel.id} className="relative group">
                  <button
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      isActive 
                        ? 'bg-primary/10 text-primary dark:bg-white dark:text-black' 
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
                      <div className="flex items-center justify-between gap-1 leading-none mb-1">
                        <p className={`text-[13px] truncate ${isActive ? 'font-semibold dark:text-black' : isUnread ? 'font-semibold' : 'font-medium'}`}>
                          {info.name}
                        </p>
                        <span className={`text-[10px] whitespace-nowrap shrink-0 ${isActive ? 'text-primary/70 dark:text-black/70' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(updatedDate, { addSuffix: true, locale: isPt ? ptBR : enUS })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-[12px] truncate pr-5 ${isActive ? 'text-primary dark:text-black/75' : isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {(() => {
                            const lastMsg = channel.messages?.[0];
                            if (!lastMsg) {
                              return channel.type === 'direct' ? (isPt ? 'Mensagem direta' : 'Direct message') : (channel.type === 'team' ? (isPt ? 'Canal da Equipe' : 'Team Channel') : (isPt ? 'Canal do Projeto' : 'Project Channel'));
                            }
                            if (lastMsg.deleted_at) {
                              return isPt ? '🚫 Mensagem apagada' : '🚫 Message deleted';
                            }
                            if (lastMsg.type === 'file') {
                              return isPt ? '📷 Arquivo anexado' : '📷 File attached';
                            }
                            const prefix = lastMsg.user_id === user?.id ? (isPt ? 'Você: ' : 'You: ') : '';
                            return prefix + (lastMsg.content || '');
                          })()}
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Deletion Dropdown Menu: Block non-admins from deleting the Team Chat */}
                  {(channel.type !== 'team' || isAdmin) && (
                    <div className="absolute right-2 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={`h-5 w-5 rounded-full hover:bg-background/80 hover:text-foreground ${isActive ? 'text-primary/70 dark:text-black/70 dark:hover:bg-black/10 dark:hover:text-black' : 'text-muted-foreground'}`}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-border shadow-md">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer font-medium" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              deleteChannel(channel.id); 
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isPt ? 'Excluir Chat' : 'Delete Chat'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
