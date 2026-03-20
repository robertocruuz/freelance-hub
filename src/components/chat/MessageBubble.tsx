import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { FileIcon, Download, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

export default function MessageBubble({ message, onToggleReaction, onEditMessage, onDeleteMessage }: any) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const isMine = message.user_id === user?.id;

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content && onEditMessage) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const profile = message.profiles || {};
  const name = profile.name || 'User';
  const avatar = profile.avatar_url;
  const initials = name.substring(0, 2).toUpperCase();
  
  // Parse defensively to guarantee UTC compliance if missing 'Z' or offset
  let dateString = message.created_at || new Date().toISOString();
  if (!dateString.endsWith('Z') && !/([+-][0-9]{2}:?[0-9]{2})$/.test(dateString)) {
    dateString += 'Z';
  }
  const time = format(new Date(dateString), 'HH:mm');
  
  const isEdited = message.updated_at && message.created_at && new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() + 1000;

  const isImage = message.type === 'file' && message.file_url && /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(message.file_url);
  const hasCustomCaption = message.content && message.content !== 'Arquivo Anexado' && message.content !== 'Documento Anexado';

  return (
    <div className={`flex w-full mt-4 space-x-3 max-w-2xl ${isMine ? 'ml-auto justify-end' : ''}`}>
      {!isMine && (
        <Avatar className="h-8 w-8 shrink-0 border border-border mt-1">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col flex-1 w-full min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{name}</span>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{time}</span>
              {isEdited && <span className="italic opacity-80 select-none">(editado)</span>}
            </div>
          </div>
        )}

        <div className={`relative group px-4 py-2.5 rounded-2xl shadow-sm max-w-[90%] md:max-w-[75%] ${
          isMine 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-card border border-border rounded-tl-sm text-foreground'
        }`}>
          {message.type === 'file' ? (
            isImage ? (
              <div className="flex flex-col gap-1.5">
                <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <img 
                    src={message.file_url} 
                    alt="Imagem Anexada" 
                    className="max-w-full rounded-md object-contain max-h-[300px] shadow-sm border border-black/5 dark:border-white/5" 
                  />
                </a>
                {hasCustomCaption && (
                  <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap mt-1">
                    {message.content}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isMine ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                  <FileIcon className="h-6 w-6" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <a 
                    href={message.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline truncate max-w-[200px]"
                  >
                    {message.content || 'Documento Anexado'}
                  </a>
                </div>
                <a href={message.file_url} download className="ml-2 hover:opacity-80">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )
          ) : (
            isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px] w-full">
                <textarea 
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full text-[15px] p-2 text-foreground bg-background rounded-md border border-border focus:outline-none focus-visible:ring-1 resize-none custom-scrollbar"
                  rows={2}
                  autoFocus
                  onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }
                  }}
                />
                <div className="flex justify-end gap-1">
                  <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleSaveEdit} className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                {message.content}
              </p>
            )
          )}

          {/* Timestamp for my messages */}
          {isMine && !isEditing && (
            <div className="text-[10px] text-primary-foreground/70 text-right mt-1 ml-4 select-none flex items-center justify-end gap-1">
              {isEdited && <span className="italic opacity-80">(editado)</span>}
              <span>{time}</span>
            </div>
          )}
          
          {/* Reaction and Action buttons hover */}
          {!isEditing && (
            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isMine ? '-left-[4.5rem]' : '-right-10'}`}>
               <button 
                 title="Reagir" 
                 onClick={() => onToggleReaction && onToggleReaction(message.id, '👍')} 
                 className="p-1 rounded-full bg-background hover:bg-muted shadow-sm border border-border text-muted-foreground"
               >
                 👍
               </button>
               {isMine && message.type === 'text' && (
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <button className="p-1 rounded-full bg-background hover:bg-muted shadow-sm border border-border text-muted-foreground outline-none">
                       <MoreVertical className="w-4 h-4" />
                     </button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={() => setIsEditing(true)}>
                       <Pencil className="h-4 w-4 mr-2" /> Editar
                     </DropdownMenuItem>
                     <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteMessage && onDeleteMessage(message.id)}>
                       <Trash2 className="h-4 w-4 mr-2" /> Excluir
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               )}
               {isMine && message.type === 'file' && (
                 <button 
                   title="Excluir Anexo"
                   onClick={() => onDeleteMessage && onDeleteMessage(message.id)}
                   className="p-1 rounded-full bg-background hover:bg-destructive/10 hover:text-destructive shadow-sm border border-border text-muted-foreground"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          )}
        </div>
        
        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (() => {
          const groupedReactions = message.reactions.reduce((acc: any, r: any) => {
            if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false };
            acc[r.emoji].count += 1;
            if (r.user_id === user?.id) acc[r.emoji].hasReacted = true;
            return acc;
          }, {});

          return (
            <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(groupedReactions).map(([emoji, data]: [string, any]) => (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction && onToggleReaction(message.id, emoji)}
                  className={`border shadow-sm rounded-full px-2.5 py-0.5 text-[11px] flex items-center gap-1 hover:opacity-80 transition-opacity cursor-default sm:cursor-pointer select-none ${
                    data.hasReacted ? 'border-primary bg-primary/10 text-primary' : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  <span>{emoji}</span>
                  {data.count > 1 && <span className="font-semibold">{data.count}</span>}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
