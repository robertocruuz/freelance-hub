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

  const inputClass = "w-full px-4 py-2 border-[3px] border-black rounded-xl bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white";

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t.invoices}</h1>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-brand bg-brand-neon flex items-center gap-2 uppercase italic font-black">
            <Plus className="w-5 h-5" /> {t.newInvoice}
          </button>
        )}
      </div>

      {creating && (
        <div className="brand-card p-8 space-y-6 bg-brand-offwhite">
          <div className="grid grid-cols-2 gap-6">
            <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-3 items-center">
                <input placeholder={t.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className={inputClass} />
                <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} className={inputClass + " text-center px-1"} />
                <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className={inputClass + " text-right px-1"} />
                <button onClick={() => removeItem(idx)} className="w-10 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-brand-blue">{t.addItem}</button>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase">{t.taxes} (%)</span>
              <input type="number" value={taxes} onChange={(e) => setTaxes(+e.target.value)} className={inputClass + " w-24 text-center"} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase">{t.discount}</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className={inputClass + " w-32 text-right"} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t-[3px] border-black/10 dark:border-white/10">
            <span className="text-2xl font-black italic">R$ {total.toFixed(2)}</span>
            <div className="flex gap-4">
              <button onClick={() => setCreating(false)} className="btn-brand bg-white text-black uppercase dark:bg-black dark:text-white">{t.cancel}</button>
              <button onClick={saveInvoice} className="btn-brand bg-brand-blue text-white uppercase">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="brand-card py-24 text-center">
          <Receipt className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">Nenhuma fatura criada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {invoices.map((inv) => (
            <div key={inv.id} className="brand-card flex items-center justify-between bg-white dark:bg-black p-6">
              <div className="min-w-0">
                <p className="text-xl font-black italic uppercase tracking-tight truncate">{inv.client_name || 'Sem cliente'}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mt-1">
                  VENC: {inv.due_date || '-'} • {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-black italic mr-4">R$ {inv.total.toFixed(2)}</span>
                <Badge className={`border-2 border-black font-black uppercase tracking-tighter rounded-full px-4 py-1.5 ${statusColors[inv.status]} dark:border-white`}>
                  {statusLabel(inv.status)}
                </Badge>
                <div className="flex gap-2 ml-4">
                   <button onClick={() => exportInvoicePdf(inv)} className="w-10 h-10 btn-brand bg-brand-neon p-0 flex items-center justify-center"><Download className="w-4 h-4 text-black" /></button>
                   <button onClick={() => deleteInvoice(inv.id)} className="w-10 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black"><Trash2 className="w-4 h-4" /></button>
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
