import { Lead } from '@/hooks/useLeads';
import { DollarSign, Calendar, Percent, MoreHorizontal, Trash2, Edit, Trophy, XCircle, FolderPlus, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ShareButton } from '@/components/kanban/ShareButton';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { user } = useAuth();
  const isShared = user ? lead.user_id !== user.id : false;
  const probColor = lead.probability >= 70 ? 'text-green-500' : lead.probability >= 40 ? 'text-yellow-500' : 'text-red-400';

  return (
    <div
      onClick={() => onEdit(lead)}
      className="bg-card border border-border/50 shadow-sm rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-border transition-all duration-200 group relative"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground truncate flex-1">{lead.title}</h4>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <ShareButton resourceType="lead" resourceId={lead.id} compact className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition p-1 rounded" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWin(lead.id)} className="text-green-600">
                <Trophy className="w-4 h-4 mr-2" /> Marcar como ganho
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLose(lead.id)} className="text-yellow-600">
                <XCircle className="w-4 h-4 mr-2" /> Marcar como perdido
              </DropdownMenuItem>
              {lead.status === 'won' && onConvertToProject && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onConvertToProject(lead)} className="text-primary">
                    <FolderPlus className="w-4 h-4 mr-2" /> Converter em Projeto
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(lead.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(lead.contact_name || isShared) && (
        <div className="flex items-center gap-1.5 mt-1">
          {lead.contact_name && (
            <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>
          )}
          {isShared && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 gap-1 shrink-0">
                  <Share2 className="w-2.5 h-2.5" />
                  Compartilhado
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Negócio compartilhado com você</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
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
