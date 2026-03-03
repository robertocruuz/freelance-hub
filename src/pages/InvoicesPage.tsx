import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Receipt, Download } from 'lucide-react';
import { generateDocumentPdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import ClientSelect from '@/components/ClientSelect';
import { useClients } from '@/hooks/useClients';

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
  pending: 'bg-accent text-accent-foreground',
  paid: 'bg-primary/10 text-primary',
  overdue: 'bg-destructive/10 text-destructive',
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
    <div className="max-w-5xl space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">{t.invoices}</h1>
          <p className="text-black/40 font-medium">{invoices.length} {t.invoices.toLowerCase()} {lang === 'pt-BR' ? 'registradas' : 'registered'}</p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="h-16 px-8 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-6 h-6" /> {t.newInvoice}
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-[2.5rem] border border-black/5 bg-white p-10 space-y-8 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-center">
                <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="text-sm text-primary font-medium hover:underline">{t.addItem}</button>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.taxes} (%)</span>
              <input type="number" value={taxes} onChange={(e) => setTaxes(+e.target.value)} className="w-20 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.discount}</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="w-24 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold">R$ {total.toFixed(2)}</span>
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm">{t.cancel}</button>
              <button onClick={saveInvoice} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="bg-white border border-black/5 rounded-[3rem] py-24 text-center">
          <Receipt className="w-16 h-16 mx-auto mb-6 text-black/10" />
          <p className="text-xl font-bold text-black/20 uppercase tracking-widest">Nenhuma fatura criada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-8 rounded-[2.5rem] border border-black/5 bg-white hover:border-black/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#f8f7f9] flex items-center justify-center text-black/40 group-hover:bg-[#1369db] group-hover:text-white transition-all duration-300">
                  <Receipt className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground mb-1">{inv.client_name || 'Sem cliente'}</p>
                  <div className="flex items-center gap-4 text-sm font-bold text-black/30 uppercase tracking-widest">
                    <span>Venc: {inv.due_date || '-'}</span>
                    <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">R$ {inv.total.toFixed(2)}</p>
                  <Badge className={`${statusColors[inv.status]} border-none rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider mt-1`}>
                    {statusLabel(inv.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 border-l border-black/5 pl-6">
                  <button onClick={() => exportInvoicePdf(inv)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-[#1369db] transition-all" title="Exportar PDF"><Download className="w-5 h-5" /></button>
                  <button onClick={() => deleteInvoice(inv.id)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-black/20 hover:text-red-500 transition-all" title="Excluir"><Trash2 className="w-5 h-5" /></button>
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
