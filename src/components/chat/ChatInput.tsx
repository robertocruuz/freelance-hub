import { useState, useRef } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Send, Paperclip, Loader2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function ChatInput({ onSendMessage }: any) {
  const { lang } = useI18n();
  const isPt = lang === 'pt-BR';
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSendMessage(message.trim(), 'text');
    setMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Math.random()}.${fileExt}`;
    const filePath = `chats/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload Error', uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(filePath);

    onSendMessage('Arquivo Anexado', 'file', publicUrl);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 bg-card/80 backdrop-blur-md border-t border-border shrink-0">
      <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto w-full">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
        
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="shrink-0 text-muted-foreground hover:bg-muted"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={isPt ? 'Anexar arquivo' : 'Attach file'}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </Button>
        
        <div className="relative flex-1">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isPt ? 'Digite uma mensagem...' : 'Type a message...'}
            className="w-full pl-4 pr-10 py-6 bg-background/50 border-input rounded-2xl shadow-sm focus-visible:ring-1"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground shrink-0"
            title={isPt ? 'Emojis' : 'Emojis'}
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        <Button 
          type="submit" 
          size="icon" 
          className="h-12 w-12 rounded-2xl shrink-0 shadow-sm"
          disabled={!message.trim() && !uploading}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
