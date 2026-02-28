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

  const inputClass = "w-full px-4 py-2 border-[3px] border-black rounded-xl bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white";

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t.budgets}</h1>
        {!isFormOpen && (
          <button onClick={() => setCreating(true)} className="btn-brand bg-brand-neon flex items-center gap-2 uppercase italic font-black">
            <Plus className="w-5 h-5" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="brand-card p-8 space-y-6 bg-brand-offwhite">
          <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-3 items-center">
                <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className={inputClass} />
                <input type="number" placeholder="QTY" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className={inputClass + " text-center px-1"} />
                <input type="number" placeholder="PRICE" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className={inputClass + " text-right px-1"} />
                <button onClick={() => removeItem(idx)} className="w-10 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-brand-blue">{t.addItem}</button>
          <div className="flex items-center justify-between pt-6 border-t-[3px] border-black/10 dark:border-white/10">
            <span className="text-2xl font-black italic">R$ {total.toFixed(2)}</span>
            <div className="flex gap-4">
              <button onClick={resetForm} className="btn-brand bg-white text-black uppercase dark:bg-black dark:text-white">{t.cancel}</button>
              <button onClick={saveBudget} className="btn-brand bg-brand-blue text-white uppercase">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="brand-card py-24 text-center">
          <FileText className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">Nenhum orçamento criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {budgets.map((b) => (
            <div key={b.id} className="brand-card flex items-center justify-between bg-white dark:bg-black p-6">
              <div className="min-w-0">
                <p className="text-xl font-black italic uppercase tracking-tight truncate">{b.client_name || 'Sem cliente'}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mt-1">
                  {b.items.length} ITENS • {new Date(b.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-black italic mr-4">R$ {b.total.toFixed(2)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <Badge className={`border-2 border-black font-black uppercase tracking-tighter rounded-full px-4 py-1.5 ${statusColors[b.status]} cursor-pointer flex items-center gap-2 dark:border-white`}>
                        {statusLabel(b.status)}
                        <ChevronDown className="w-4 h-4" />
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-2 border-black rounded-xl dark:border-white">
                    {statuses.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => changeStatus(b.id, s)}
                        className={`font-black uppercase text-xs ${b.status === s ? 'bg-brand-neon' : ''}`}
                      >
                        {statusLabel(s)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex gap-2 ml-4">
                   <button onClick={() => startEditing(b)} className="w-10 h-10 btn-brand bg-brand-offwhite p-0 flex items-center justify-center dark:bg-black"><Pencil className="w-4 h-4" /></button>
                   <button onClick={() => exportBudgetPdf(b)} className="w-10 h-10 btn-brand bg-brand-neon p-0 flex items-center justify-center"><Download className="w-4 h-4 text-black" /></button>
                   <button onClick={() => deleteBudget(b.id)} className="w-10 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black"><Trash2 className="w-4 h-4" /></button>
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
