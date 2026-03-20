import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/hooks/useI18n';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatArea from '@/components/chat/ChatArea';

export default function ChatPage() {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';
  const isMobile = useIsMobile();
  const chatState = useChat();
  const { channels, activeChannelId, setActiveChannelId } = chatState;
  const [searchParams, setSearchParams] = useSearchParams();

  // Read from URL on mount or when channels load
  useEffect(() => {
    const channelParam = searchParams.get('channel');
    if (channelParam && channelParam !== activeChannelId) {
      setActiveChannelId(channelParam);
    }
  }, [searchParams.get('channel')]);

  // Update URL when activeChannelId changes
  useEffect(() => {
    if (activeChannelId) {
      setSearchParams({ channel: activeChannelId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeChannelId, setSearchParams]);

  const showSidebar = !isMobile || !activeChannelId;
  const showArea = !isMobile || !!activeChannelId;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.28))] md:h-[calc(100vh-theme(spacing.12))]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {isPt ? 'Mensagens' : 'Messages'}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base mt-1">
            {isPt ? 'Comunicação direta com equipe e clientes' : 'Direct communication with team and clients'}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card/50 border border-border rounded-2xl overflow-hidden flex shadow-sm">
        {showSidebar && (
          <div className={`${isMobile ? 'w-full' : 'w-[320px] lg:w-[380px]'} border-r border-border flex shrink-0`}>
            <ChatSidebar chatState={chatState} isMobile={isMobile} />
          </div>
        )}
        
        {showArea && (
          <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            {activeChannelId ? (
              <ChatArea chatState={chatState} isMobile={isMobile} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-card/30">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {isPt ? 'Suas Mensagens' : 'Your Messages'}
                </h3>
                <p className="max-w-sm">
                  {isPt 
                    ? 'Selecione uma conversa na barra lateral para começar a enviar mensagens.' 
                    : 'Select a conversation from the sidebar to start messaging.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
