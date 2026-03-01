import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, DollarSign, Calendar } from 'lucide-react';
import { generateDocumentPdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import ClientSelect from '@/components/ClientSelect';
import { useClients } from '@/hooks/useClients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BudgetItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Budget {
  id: string;
  client_id: string | null;
  client_name?: string;
  items: BudgetItem[];
  total: number;
  status: string;
  created_at: string;
}

const statuses = ['draft', 'sent', 'approved', 'rejected'] as const;

const statusColors: Record<string, string> = {
  draft: 'bg-muted border-foreground/20',
  sent: 'bg-accent border-foreground',
  approved: 'bg-secondary border-foreground',
  rejected: 'bg-destructive text-destructive-foreground border-foreground',
};

const BudgetsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<BudgetItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const { clients } = useClients();

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const loadBudgets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setBudgets(data.map(b => {
        const cl = clients.find(c => c.id === b.client_id);
        return {
          ...b,
          client_name: cl?.name,
          items: (Array.isArray(b.items) ? b.items : []) as unknown as BudgetItem[],
        };
      }));
    }
  }, [user, clients]);

  useEffect(() => { loadBudgets(); }, [loadBudgets]);

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof BudgetItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const saveBudget = async () => {
    if (!user) return;

    if (editingId) {
      const { error } = await supabase.from('budgets').update({
        client_id: clientId || null,
        items: items as unknown as Json,
        total,
      }).eq('id', editingId);
      if (error) toast.error(error.message);
      else {
        toast.success(t.save + '!');
        resetForm();
        loadBudgets();
      }
    } else {
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        client_id: clientId || null,
        items: items as unknown as Json,
        total,
        status: 'draft',
      });
      if (error) toast.error(error.message);
      else {
        toast.success(t.save + '!');
        resetForm();
        loadBudgets();
      }
    }
  };

  const resetForm = () => {
    setCreating(false);
    setEditingId(null);
    setClientId('');
    setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
  };

  const startEditing = (b: Budget) => {
    setEditingId(b.id);
    setClientId(b.client_id || '');
    setItems(b.items.length > 0 ? b.items : [{ description: '', quantity: 1, unitPrice: 0 }]);
    setCreating(true);
  };

  const changeStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('budgets').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(statusLabel(status));
      loadBudgets();
    }
  };

  const deleteBudget = async (id: string) => {
    await supabase.from('budgets').delete().eq('id', id);
    loadBudgets();
  };

  const statusLabel = (s: string) => (t as any)[s] || s;

  const exportBudgetPdf = (b: Budget) => {
    generateDocumentPdf({
      title: t.budgets,
      type: 'budget',
      items: b.items,
      total: b.total,
      status: statusLabel(b.status),
      createdAt: b.created_at,
    });
  };

  const isFormOpen = creating || editingId;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            {t.budgets}
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">Crie propostas irrecusáveis</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => setCreating(true)} className="brutalist-button-primary flex items-center gap-3 px-8 py-4 text-lg italic">
            <Plus className="w-6 h-6" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="brutalist-card p-8 bg-card border-4 space-y-8 rotate-[-0.5deg]">
           <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest">Cliente</label>
                <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
              </div>
              <div className="bg-accent/20 border-4 border-foreground p-4 rotate-2 flex flex-col justify-center min-w-[200px]">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Total Geral</span>
                <span className="text-3xl font-black italic">R$ {total.toFixed(2)}</span>
              </div>
           </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest">Itens do Orçamento</label>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_100px_150px_auto] gap-3 items-start">
                  <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="brutalist-input" />
                  <input type="number" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className="brutalist-input text-center" />
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input type="number" placeholder="Preço" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="brutalist-input pl-10 text-right" />
                  </div>
                  <button onClick={() => removeItem(idx)} className="w-12 h-12 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="brutalist-button bg-secondary/30 px-6 py-2 text-xs uppercase font-black flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t.addItem}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-4 border-foreground">
            <button onClick={saveBudget} className="brutalist-button-primary px-10 py-4 text-xl italic uppercase font-black">{t.save}</button>
            <button onClick={resetForm} className="brutalist-button bg-background px-10 py-4 text-xl italic uppercase font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="brutalist-card p-20 text-center bg-muted/20 border-dashed rotate-[-1deg]">
          <FileText className="w-16 h-16 mx-auto mb-6 opacity-40" />
          <p className="font-black uppercase tracking-widest text-muted-foreground">Nenhum orçamento criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {budgets.map((b, idx) => (
            <div key={b.id} className={`brutalist-card p-6 flex flex-col md:flex-row items-center gap-8 bg-card ${idx % 2 === 0 ? 'rotate-[0.3deg]' : 'rotate-[-0.3deg]'}`}>
              <div className="w-16 h-16 bg-accent border-4 border-foreground rounded-full flex items-center justify-center shrink-0">
                 <FileText className="w-8 h-8" />
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-2xl font-black uppercase tracking-tighter italic leading-none truncate">{b.client_name || 'Sem cliente'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(b.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {b.items.length} itens
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-2">
                 <span className="text-3xl font-black italic leading-none">R$ {b.total.toFixed(2)}</span>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <Badge className={`${statusColors[b.status]} border-2 font-black uppercase tracking-widest text-[10px] px-3 py-1 cursor-pointer flex items-center gap-2`}>
                          {statusLabel(b.status)}
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-4 border-foreground p-2 rounded-none shadow-brutalist">
                      {statuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => changeStatus(b.id, s)}
                          className={`font-black uppercase tracking-widest text-xs py-2 focus:bg-primary focus:text-primary-foreground ${b.status === s ? 'bg-secondary' : ''}`}
                        >
                          {statusLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>

              <div className="flex gap-3 pt-4 md:pt-0 md:border-l-4 border-foreground/10 md:pl-8">
                <button onClick={() => startEditing(b)} className="w-12 h-12 brutalist-button bg-background flex items-center justify-center p-0" title="Editar">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => exportBudgetPdf(b)} className="w-12 h-12 brutalist-button bg-secondary flex items-center justify-center p-0" title="Exportar PDF">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => deleteBudget(b.id)} className="w-12 h-12 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0" title="Excluir">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
