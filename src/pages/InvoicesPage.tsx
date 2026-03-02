import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Receipt, Download, FileText, Calendar, DollarSign, Percent, Minus } from 'lucide-react';
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
  pending: 'bg-yellow-400 text-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
  paid: 'bg-primary text-white border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
  overdue: 'bg-destructive text-white border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl italic font-display">{t.invoices}</h1>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="brutalist-button-primary h-14 uppercase tracking-widest flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> {t.newInvoice}
          </button>
        )}
      </div>

      {creating && (
        <div className="brutalist-card bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 bg-primary text-white border-b-2 border-black">
            <h2 className="text-2xl font-bold italic font-display">{t.newInvoice}</h2>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest ml-1">CLIENTE</label>
                <div className="[&_button]:brutalist-input [&_button]:h-12 [&_button]:bg-white [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:justify-between">
                  <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest ml-1">DATA DE VENCIMENTO</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full brutalist-input h-12 pl-12" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest ml-1">ITENS DA FATURA</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-t-2 border-black/5">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Percent className="w-3 h-3" /> IMPOSTOS (%)</label>
                  <input type="number" value={taxes} onChange={(e) => setTaxes(+e.target.value)} className="w-full brutalist-input h-10 text-center" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Minus className="w-3 h-3" /> DESCONTO</label>
                  <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="w-full brutalist-input h-10 text-right" />
                </div>
              </div>
              <div className="flex flex-col items-end justify-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TOTAL DA FATURA</p>
                <p className="text-5xl font-black italic text-primary">R$ {total.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={saveInvoice} className="flex-1 brutalist-button-primary h-14 uppercase tracking-widest">
                {t.save}
              </button>
              <button onClick={() => setCreating(false)} className="flex-1 brutalist-button bg-white text-black h-14 uppercase tracking-widest">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="brutalist-card bg-white p-20 text-center border-dashed">
          <Receipt className="w-16 h-16 mx-auto mb-4 opacity-20 text-black" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground">Nenhuma fatura criada ainda.</p>
        </div>
      ) : (
        !creating && (
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((inv) => (
              <div key={inv.id} className="brutalist-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-[#f8f7f9] transition-colors hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-2xl font-bold uppercase italic group-hover:text-primary transition-colors leading-tight">{inv.client_name || 'Sem cliente'}</p>
                    <Badge className={statusColors[inv.status]}>{statusLabel(inv.status)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {inv.items.length} ITENS</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> VENC: {inv.due_date || '-'}</span>
                    <span className="opacity-50">CRIADA EM {new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">VALOR TOTAL</p>
                    <p className="text-3xl font-black italic text-black">R$ {inv.total.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportInvoicePdf(inv)} className="w-11 h-11 brutalist-card bg-white flex items-center justify-center hover:bg-[#d7ff73] transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none" title="Exportar PDF">
                      <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteInvoice(inv.id)} className="w-11 h-11 brutalist-card bg-white flex items-center justify-center hover:bg-destructive hover:text-white transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
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

export default InvoicesPage;
