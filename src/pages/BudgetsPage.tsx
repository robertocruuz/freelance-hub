import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, Users } from 'lucide-react';
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
  draft: 'bg-white text-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
  sent: 'bg-yellow-400 text-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
  approved: 'bg-[#d7ff73] text-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
  rejected: 'bg-destructive text-white border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#ff88db] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-4xl italic font-display">{t.budgets}</h1>
        </div>
        {!isFormOpen && (
          <button onClick={() => setCreating(true)} className="brutalist-button-primary h-14 uppercase tracking-widest flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="brutalist-card bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 bg-primary text-white border-b-2 border-black">
            <h2 className="text-2xl font-bold italic font-display">{editingId ? t.editBudget : t.newBudget}</h2>
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest ml-1">CLIENTE</label>
              <div className="[&_button]:brutalist-input [&_button]:h-12 [&_button]:bg-white [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:justify-between">
                <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest ml-1">ITENS DO ORÇAMENTO</label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_48px] gap-3 items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">DESCRIÇÃO</p>
                    <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="w-full brutalist-input h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">QTD</p>
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className="w-full brutalist-input h-10 text-sm text-center" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">VALOR UNIT.</p>
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="w-full brutalist-input h-10 text-sm text-right" />
                  </div>
                  <button onClick={() => removeItem(idx)} className="w-12 h-10 brutalist-card bg-white flex items-center justify-center hover:bg-destructive hover:text-white transition-colors border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none mb-[2px]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addItem} className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 hover:translate-x-1 transition-transform">
                <Plus className="w-4 h-4" /> {t.addItem}
              </button>
            </div>

            <div className="flex flex-col items-end justify-center py-6 border-t-2 border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TOTAL ESTIMADO</p>
              <p className="text-5xl font-black italic text-primary">R$ {total.toFixed(2)}</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={saveBudget} className="flex-1 brutalist-button-primary h-14 uppercase tracking-widest">
                {t.save}
              </button>
              <button onClick={resetForm} className="flex-1 brutalist-button bg-white text-black h-14 uppercase tracking-widest">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="brutalist-card bg-white p-20 text-center border-dashed">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20 text-black" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground">Nenhum orçamento criado ainda.</p>
        </div>
      ) : (
        !isFormOpen && (
          <div className="grid grid-cols-1 gap-4">
            {budgets.map((b) => (
              <div key={b.id} className="brutalist-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-[#f8f7f9] transition-colors hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-2xl font-bold uppercase italic group-hover:text-primary transition-colors leading-tight">{b.client_name || 'Sem cliente'}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none">
                          <Badge className={`${statusColors[b.status]} cursor-pointer flex items-center gap-1 uppercase text-[10px] font-black tracking-widest px-3 py-1 rounded-full`}>
                            {statusLabel(b.status)}
                            <ChevronDown className="w-3 h-3" />
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="brutalist-card bg-white p-2 min-w-[140px]">
                        {statuses.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => changeStatus(b.id, s)}
                            className={`cursor-pointer uppercase text-[10px] font-black tracking-widest p-2 hover:bg-black hover:text-white transition-colors ${b.status === s ? 'bg-primary/10' : ''}`}
                          >
                            {statusLabel(s)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {b.items.length} ITENS</span>
                    <span className="opacity-50">CRIADO EM {new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TOTAL</p>
                    <p className="text-3xl font-black italic text-black">R$ {b.total.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditing(b)} className="w-11 h-11 brutalist-card bg-white flex items-center justify-center hover:bg-secondary transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none" title="Editar">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => exportBudgetPdf(b)} className="w-11 h-11 brutalist-card bg-white flex items-center justify-center hover:bg-[#d7ff73] transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none" title="Exportar PDF">
                      <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteBudget(b.id)} className="w-11 h-11 brutalist-card bg-white flex items-center justify-center hover:bg-destructive hover:text-white transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default BudgetsPage;
