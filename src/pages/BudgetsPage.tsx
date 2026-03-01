import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, Calendar, User, MoreVertical } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-brand-blue/10 text-brand-blue',
  approved: 'bg-brand-darkgreen/10 text-brand-darkgreen',
  rejected: 'bg-red-50 text-red-500',
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
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.budgets}</h1>
          <p className="text-slate-500 font-medium">Create and manage professional quotes for your clients.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="clean-card bg-slate-50/50 border-dashed border-2 border-slate-200">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? t.editBudget : t.newBudget}
              </h2>
              <button onClick={resetForm} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                {t.cancel}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <span className="text-sm font-bold text-slate-700">Line Items</span>
                <button
                  onClick={addItem}
                  className="text-xs font-bold text-brand-blue hover:underline"
                >
                  {t.addItem}
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_auto] gap-3">
                    <input
                      placeholder={t.description}
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="px-5 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all shadow-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', +e.target.value)}
                      className="px-4 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-bold text-center transition-all shadow-sm"
                    />
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-bold text-right transition-all shadow-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-red-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 gap-6">
              <div className="text-center md:text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Total</p>
                <span className="text-3xl font-display font-bold text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button onClick={resetForm} className="flex-1 md:flex-none btn-outline px-8">{t.cancel}</button>
                <button onClick={saveBudget} className="flex-1 md:flex-none btn-primary px-8">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="clean-card py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-bold text-slate-400 tracking-tight">No budgets created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="clean-card group hover:border-brand-blue/20 transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-brand-blue/5 transition-colors">
                  <FileText className="w-7 h-7 text-slate-400 group-hover:text-brand-blue transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{b.client_name || 'No Client'}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                    <span className="text-slate-400">{b.items.length} line items</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between md:justify-end gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-xl font-bold text-slate-900">R$ {b.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <Badge className={cn(
                          "font-bold uppercase tracking-wider rounded-xl px-4 py-2 cursor-pointer flex items-center gap-2 border-none shadow-sm transition-all hover:shadow-md",
                          statusColors[b.status]
                        )}>
                          {statusLabel(b.status)}
                          <ChevronDown className="w-4 h-4" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl p-2 min-w-[140px]">
                      {statuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => changeStatus(b.id, s)}
                          className={cn(
                            "rounded-lg font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer",
                            b.status === s ? 'bg-slate-50 text-brand-blue' : 'text-slate-500'
                          )}
                        >
                          {statusLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex gap-1">
                     <button
                       onClick={() => startEditing(b)}
                       className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-all"
                     >
                       <Pencil className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => exportBudgetPdf(b)}
                       className="p-3 rounded-xl bg-brand-neon/10 text-brand-darkgreen hover:bg-brand-neon/20 transition-all"
                     >
                       <Download className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => deleteBudget(b.id)}
                       className="p-3 rounded-xl bg-red-50 text-red-400 hover:text-red-500 hover:bg-red-100 transition-all"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
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
