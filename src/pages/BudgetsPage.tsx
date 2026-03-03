import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown } from 'lucide-react';
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
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-accent text-accent-foreground',
  approved: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
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
    <div className="max-w-5xl space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">{t.budgets}</h1>
          <p className="text-black/40 font-medium">{budgets.length} {t.budgets.toLowerCase()} {lang === 'pt-BR' ? 'registrados' : 'registered'}</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setCreating(true)}
            className="h-16 px-8 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-6 h-6" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-[2.5rem] border border-black/5 bg-white p-10 space-y-8 shadow-sm">
          <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-center">
                <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder={t.quantity} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder={t.unitPrice} value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="text-sm text-primary font-medium hover:underline">{t.addItem}</button>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold">R$ {total.toFixed(2)}</span>
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm">{t.cancel}</button>
              <button onClick={saveBudget} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="bg-white border border-black/5 rounded-[3rem] py-24 text-center">
          <FileText className="w-16 h-16 mx-auto mb-6 text-black/10" />
          <p className="text-xl font-bold text-black/20 uppercase tracking-widest">Nenhum orçamento criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-8 rounded-[2.5rem] border border-black/5 bg-white hover:border-black/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#f8f7f9] flex items-center justify-center text-black/40 group-hover:bg-[#1369db] group-hover:text-white transition-all duration-300">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground mb-1">{b.client_name || 'Sem cliente'}</p>
                  <div className="flex items-center gap-4 text-sm font-bold text-black/30 uppercase tracking-widest">
                    <span>{b.items.length} itens</span>
                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">R$ {b.total.toFixed(2)}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none mt-1">
                        <Badge className={`${statusColors[b.status]} cursor-pointer flex items-center gap-1 rounded-lg border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider`}>
                          {statusLabel(b.status)}
                          <ChevronDown className="w-3 h-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-black/5 shadow-xl">
                      {statuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => changeStatus(b.id, s)}
                          className={`rounded-lg py-2 font-bold text-xs uppercase tracking-wider cursor-pointer ${b.status === s ? 'bg-black/5' : ''}`}
                        >
                          {statusLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 border-l border-black/5 pl-6">
                  <button onClick={() => startEditing(b)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-black transition-all" title="Editar"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => exportBudgetPdf(b)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-[#1369db] transition-all" title="Exportar PDF"><Download className="w-5 h-5" /></button>
                  <button onClick={() => deleteBudget(b.id)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-black/20 hover:text-red-500 transition-all" title="Excluir"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
