import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useChecklist, ChecklistItem } from '@/hooks/useChecklist';
import { useI18n } from '@/hooks/useI18n';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListTodo, Plus, Trash2, X, Check } from 'lucide-react';

export const UserChecklist = ({ projectId, className, accentColor, hideHeader = false }: { projectId?: string, className?: string, accentColor?: string | null, hideHeader?: boolean }) => {
  const { items, loading, addItem, toggleItem, deleteItem, updateItem, refresh } = useChecklist(projectId);
  const { t } = useI18n();
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItem.trim()) return;
    await addItem(newItem.trim());
    setNewItem('');
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSaveEdit = async () => {
    if (editingId && editContent.trim()) {
      await updateItem(editingId, { content: editContent.trim() });
    }
    setEditingId(null);
  };

  if (loading && items.length === 0) {
    return (
      <div className={cn("bg-card p-6 rounded-2xl border border-border animate-pulse flex flex-col", className)}>
        {!hideHeader && <div className="h-6 bg-muted/40 rounded w-32 mb-6" />}
        <div className="space-y-3">
          <div className="h-10 bg-muted/30 rounded w-full" />
          <div className="h-10 bg-muted/30 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <section className={cn("bg-card px-6 pt-6 pb-3 rounded-2xl border border-border flex flex-col gap-4", className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListTodo className="w-5 h-5" style={accentColor ? { color: accentColor } : undefined} />
            <h2 className="font-semibold text-lg text-foreground">{t.checklist}</h2>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto minimal-scrollbar max-h-[400px] min-h-0 pr-1 -mr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-60 py-8">
            <span className="text-sm font-medium text-muted-foreground">{t.noChecklistItems}</span>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center gap-3 py-2.5 transition-all border-b",
                  editingId === item.id ? "border-primary/50" : "border-border last:border-0"
                )}
              >
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                  className="transition-all duration-300"
                />
                
                {editingId === item.id ? (
                  <div className="flex flex-1 gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-200">
                    <Input
                      autoFocus
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-8 py-1 px-0 text-sm bg-transparent border-0 rounded-none focus-visible:ring-0 flex-1"
                    />
                    <div className="flex items-center gap-1.5 shrink-0 px-1">
                      <button onClick={handleSaveEdit} className="text-emerald-500 hover:text-emerald-400 p-1 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span
                    onClick={() => handleStartEdit(item)}
                    className={`flex-1 text-sm font-medium cursor-text truncate transition-all duration-300 py-1 ${
                      item.is_completed ? 'text-muted-foreground line-through opacity-40' : 'text-foreground/90'
                    }`}
                  >
                    {item.content}
                  </span>
                )}

                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="relative group/form mt-auto pt-4">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={t.addChecklistItem}
          className="bg-transparent border-0 rounded-none px-0 pr-8 focus-visible:ring-0 transition-all placeholder-[#676F7E] text-sm h-9 shadow-none"
        />
        {newItem.trim() && (
          <button 
            type="submit"
            className="absolute right-0 top-[calc(1rem+0.35rem)] p-1 text-primary hover:text-primary-foreground hover:bg-primary rounded-md transition-all animate-in fade-in zoom-in duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </section>
  );
};
