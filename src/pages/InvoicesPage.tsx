import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Receipt, Download, Calendar, User, FileText, Percent, Tag, MoreVertical } from 'lucide-react';
import { generateDocumentPdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import ClientSelect from '@/components/ClientSelect';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  client_id: string | null;
  client_name?: string;
  items: InvoiceItem[];
  total: number;
  taxes: number;
  discount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-brand-blue/10 text-brand-blue',
  paid: 'bg-brand-darkgreen/10 text-brand-darkgreen',
  overdue: 'bg-red-50 text-red-500',
};

const InvoicesPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [taxes, setTaxes] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const { clients } = useClients();

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = subtotal + (subtotal * taxes) / 100 - discount;

  const loadInvoices = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setInvoices(data.map(inv => {
        const cl = clients.find(c => c.id === inv.client_id);
        return {
          ...inv,
          client_name: cl?.name,
          items: (Array.isArray(inv.items) ? inv.items : []) as unknown as InvoiceItem[],
        };
      }));
    }
  }, [user, clients]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const saveInvoice = async () => {
    if (!user) return;
    const { error } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: clientId || null,
      items: items as unknown as Json,
      total,
      taxes,
      discount,
      status: 'pending',
      due_date: dueDate || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.save + '!');
      setCreating(false);
      setClientId('');
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setTaxes(0);
      setDiscount(0);
      setDueDate('');
      loadInvoices();
    }
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id);
    loadInvoices();
  };

  const statusLabel = (s: string) => (t as any)[s] || s;

  const exportInvoicePdf = (inv: Invoice) => {
    generateDocumentPdf({
      title: t.invoices,
      type: 'invoice',
      items: inv.items,
      total: inv.total,
      status: statusLabel(inv.status),
      createdAt: inv.created_at,
      taxes: inv.taxes,
      discount: inv.discount,
      dueDate: inv.due_date,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.invoices}</h1>
          <p className="text-slate-500 font-medium">Issue invoices and track your payments.</p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" /> {t.newInvoice}
          </button>
        )}
      </div>

      {creating && (
        <div className="clean-card bg-slate-50/50 border-dashed border-2 border-slate-200">
           <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t.newInvoice}</h2>
              <button onClick={() => setCreating(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                {t.cancel}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 ml-1">Due Date</label>
                 <input
                   type="date"
                   value={dueDate}
                   onChange={(e) => setDueDate(e.target.value)}
                   className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all shadow-sm"
                 />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <span className="text-sm font-bold text-slate-700">Service Items</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                   <Percent className="w-4 h-4" /> {t.taxes} (%)
                 </label>
                 <input
                   type="number"
                   value={taxes}
                   onChange={(e) => setTaxes(+e.target.value)}
                   className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-bold text-center transition-all shadow-sm"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                   <Tag className="w-4 h-4" /> {t.discount} (Fixed)
                 </label>
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                   <input
                     type="number"
                     value={discount}
                     onChange={(e) => setDiscount(+e.target.value)}
                     className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue/20 outline-none font-bold text-right transition-all shadow-sm"
                   />
                 </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 gap-6">
              <div className="text-center md:text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Final Invoice Amount</p>
                <span className="text-3xl font-display font-bold text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button onClick={() => setCreating(false)} className="flex-1 md:flex-none btn-outline px-8">{t.cancel}</button>
                <button onClick={saveInvoice} className="flex-1 md:flex-none btn-primary px-8">{t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="clean-card py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Receipt className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-bold text-slate-400 tracking-tight">No invoices issued yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((inv) => (
            <div key={inv.id} className="clean-card group hover:border-brand-blue/20 transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-brand-blue/5 transition-colors">
                  <Receipt className="w-7 h-7 text-slate-400 group-hover:text-brand-blue transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{inv.client_name || 'No Client'}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Due: {inv.due_date || 'N/A'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                    <span className="text-slate-400">Created {new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between md:justify-end gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-xl font-bold text-slate-900">R$ {inv.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "font-bold uppercase tracking-wider rounded-xl px-4 py-2 border-none shadow-sm",
                    statusColors[inv.status]
                  )}>
                    {statusLabel(inv.status)}
                  </Badge>

                  <div className="flex gap-1 ml-2">
                     <button
                       onClick={() => exportInvoicePdf(inv)}
                       className="p-3 rounded-xl bg-brand-neon/10 text-brand-darkgreen hover:bg-brand-neon/20 transition-all"
                       title="Download PDF"
                     >
                       <Download className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => deleteInvoice(inv.id)}
                       className="p-3 rounded-xl bg-red-50 text-red-400 hover:text-red-500 hover:bg-red-100 transition-all"
                       title="Delete"
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

export default InvoicesPage;
