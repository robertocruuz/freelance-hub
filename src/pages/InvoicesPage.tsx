import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Receipt, Download, Calendar, DollarSign, Tag, Percent } from 'lucide-react';
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
  pending: 'bg-accent border-foreground text-foreground',
  paid: 'bg-secondary border-foreground text-foreground',
  overdue: 'bg-destructive border-foreground text-destructive-foreground',
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
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            {t.invoices}
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">Fature com profissionalismo</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="brutalist-button-primary flex items-center gap-3 px-8 py-4 text-lg italic">
            <Plus className="w-6 h-6" /> {t.newInvoice}
          </button>
        )}
      </div>

      {creating && (
        <div className="brutalist-card p-8 bg-card border-4 space-y-8 rotate-[0.5deg]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">Cliente</label>
              <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">Vencimento</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="brutalist-input w-full" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest">Itens da Fatura</label>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_100px_150px_auto] gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="flex flex-wrap gap-4">
               <div className="space-y-1 flex-1 min-w-[120px]">
                 <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Percent className="w-3 h-3" /> {t.taxes} (%)</label>
                 <input type="number" value={taxes} onChange={(e) => setTaxes(+e.target.value)} className="brutalist-input w-full text-center" />
               </div>
               <div className="space-y-1 flex-1 min-w-[120px]">
                 <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Tag className="w-3 h-3" /> {t.discount}</label>
                 <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="brutalist-input w-full text-right" />
               </div>
            </div>

            <div className="bg-secondary p-6 border-4 border-foreground rotate-[-1deg] flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Total a Faturar</span>
              <span className="text-4xl font-black italic">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-4 border-foreground">
            <button onClick={saveInvoice} className="brutalist-button-primary px-10 py-4 text-xl italic uppercase font-black">{t.save}</button>
            <button onClick={() => setCreating(false)} className="brutalist-button bg-background px-10 py-4 text-xl italic uppercase font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="brutalist-card p-20 text-center bg-muted/20 border-dashed rotate-[-1deg]">
          <Receipt className="w-16 h-16 mx-auto mb-6 opacity-40" />
          <p className="font-black uppercase tracking-widest text-muted-foreground">Nenhuma fatura criada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {invoices.map((inv, idx) => (
            <div key={inv.id} className={`brutalist-card p-6 flex flex-col md:flex-row items-center gap-8 bg-card ${idx % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.3deg]'}`}>
              <div className="w-16 h-16 bg-primary text-primary-foreground border-4 border-foreground rounded flex items-center justify-center shrink-0 rotate-[-5deg] shadow-brutalist">
                 <Receipt className="w-8 h-8" />
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-2xl font-black uppercase tracking-tighter italic leading-none truncate">{inv.client_name || 'Sem cliente'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Venc: <span className="text-foreground">{inv.due_date || 'N/A'}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {inv.items.length} itens
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-2">
                 <span className="text-3xl font-black italic leading-none">R$ {inv.total.toFixed(2)}</span>
                 <Badge className={`${statusColors[inv.status]} border-2 font-black uppercase tracking-widest text-[10px] px-3 py-1 rounded-none`}>
                   {statusLabel(inv.status)}
                 </Badge>
              </div>

              <div className="flex gap-3 pt-4 md:pt-0 md:border-l-4 border-foreground/10 md:pl-8">
                <button onClick={() => exportInvoicePdf(inv)} className="w-12 h-12 brutalist-button bg-secondary flex items-center justify-center p-0" title="Exportar PDF">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => deleteInvoice(inv.id)} className="w-12 h-12 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0" title="Excluir">
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

export default InvoicesPage;
