import { Lead } from '@/hooks/useLeads';
import { DollarSign, Calendar, Percent, MoreHorizontal, Trash2, Edit, Trophy, XCircle, FolderPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onWin: (id: string) => void;
  onLose: (id: string) => void;
  onConvertToProject?: (lead: Lead) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function LeadCard({ lead, onEdit, onDelete, onWin, onLose, onConvertToProject }: LeadCardProps) {
  const probColor = lead.probability >= 70 ? 'text-green-500' : lead.probability >= 40 ? 'text-yellow-500' : 'text-red-400';

  return (
    <div
      onClick={() => onEdit(lead)}
      className="group bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground truncate flex-1">{lead.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEdit(lead)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onWin(lead.id)} className="text-green-600">
              <Trophy className="w-4 h-4 mr-2" /> Marcar como ganho
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLose(lead.id)} className="text-yellow-600">
              <XCircle className="w-4 h-4 mr-2" /> Marcar como perdido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(lead.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {lead.contact_name && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{lead.contact_name}</p>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          {formatCurrency(lead.value)}
        </span>
        <span className={cn('flex items-center gap-1 text-xs font-medium', probColor)}>
          <Percent className="w-3.5 h-3.5" />
          {lead.probability}%
        </span>
        {lead.expected_close_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(lead.expected_close_date + 'T12:00:00'), 'dd MMM', { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}
