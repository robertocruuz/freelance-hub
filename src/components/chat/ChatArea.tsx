import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Hash, Users, User, ArrowLeft, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { useOrganization } from '@/hooks/useOrganization';

export default function ChatArea({ chatState, isMobile }: any) {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';
  const { orgProfile } = useOrganization();
  const { user } = useAuth();
  const { 
    channels, 
    activeChannelId, 
    setActiveChannelId, 
    messages, 
    members, 
    loadingMessages, 
    sendMessage, 
    editMessage,
    deleteMessage,
    toggleReaction 
  } = chatState;
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const activeChannel = channels.find((c: any) => c.id === activeChannelId);
  if (!activeChannel) return null;

  let headerName = activeChannel.name;
  let HeaderIcon = Hash;
  let initials = 'CH';
  let avatar = '';

  if (activeChannel.type === 'direct') {
    const otherMember = members.find((m: any) => m.user_id !== user?.id);
    headerName = otherMember?.profiles?.name || (isPt ? 'Usuário' : 'User');
    HeaderIcon = User;
    initials = headerName.substring(0, 2).toUpperCase();
    avatar = otherMember?.profiles?.avatar_url || '';
  } else if (activeChannel.type === 'team') {
    const orgName = orgProfile?.name || (isPt ? 'Equipe' : 'Team');
    headerName = activeChannel.name === 'Equipe Geral' && orgName ? orgName : (activeChannel.name || orgName);
    HeaderIcon = Users;
    initials = headerName.substring(0, 2).toUpperCase();
    avatar = orgProfile?.logo || '';
  } else if (activeChannel.type === 'project') {
    headerName = activeChannel.name || (isPt ? 'Projeto' : 'Project');
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="mr-1 -ml-2 text-muted-foreground" onClick={() => setActiveChannelId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10 border border-border bg-background shadow-sm">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col">
          <h2 className="font-semibold text-foreground text-[15px]">{headerName}</h2>
          <span className="text-[11px] text-muted-foreground font-medium">
            {activeChannel.type === 'direct' 
              ? (isPt ? 'Mensagem Direta' : 'Direct Message')
              : `${members.length} ${isPt ? 'membros' : 'members'}`}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-foreground/20">
              <HeaderIcon className="h-8 w-8" />
            </div>
            <p className="text-sm">
              {isPt ? 'Aqui começa a sua conversa.' : 'This is the start of your conversation.'}
            </p>
          </div>
        ) : (
          <div className="flex justify-center w-full">
             <div className="w-full max-w-4xl pb-4">
                {messages.map((msg: any) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    onToggleReaction={toggleReaction} 
                    onEditMessage={editMessage}
                    onDeleteMessage={deleteMessage}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={(content: string, type: string, url: string) => sendMessage(content, type, url)} />
    </div>
  );
}
