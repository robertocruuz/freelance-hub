import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeadStage } from '@/hooks/useLeads';
import { Trash2, GripVertical, Plus } from 'lucide-react';

interface StageSettingsModalProps {
  open: boolean;
  onClose: () => void;
  stages: LeadStage[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: string, updates: Partial<LeadStage>) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6'];

export default function StageSettingsModal({ open, onClose, stages, onAdd, onUpdate, onDelete }: StageSettingsModalProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newColor);
    setNewName('');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Etapas do Funil</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2 max-h-[50vh] overflow-y-auto">
          {stages.map(stage => (
            <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
              <Input
                value={stage.name}
                onChange={e => onUpdate(stage.id, { name: e.target.value })}
                className="h-8 text-sm flex-1"
              />
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdate(stage.id, { color: c })}
                    className="w-4 h-4 rounded-full border border-border transition-transform hover:scale-125"
                    style={{ backgroundColor: c, outline: stage.color === c ? '2px solid currentColor' : 'none', outlineOffset: 1 }}
                  />
                ))}
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(stage.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nova etapa..."
            className="h-9 text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-1 shrink-0">
            {COLORS.slice(0, 4).map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-4 h-4 rounded-full border border-border transition-transform hover:scale-125"
                style={{ backgroundColor: c, outline: newColor === c ? '2px solid currentColor' : 'none', outlineOffset: 1 }}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
