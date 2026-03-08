import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Receipt, Download, FolderKanban } from 'lucide-react';
import { generateDocumentPdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface ProjectWithItems {
  id: string;
  name: string;
  client_id: string | null;
  client_name?: string;
  due_date: string | null;
  items: { name: string; value: number }[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-accent text-accent-foreground',
  paid: 'bg-primary/10 text-primary',
  overdue: 'bg-destructive/10 text-destructive',
};

const InvoicesPage = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [taxes, setTaxes] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const { clients } = useClients();
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = subtotal + (subtotal * taxes) / 100 - discount;

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data: projData } = await supabase
      .from('projects')
      .select('id, name, client_id, due_date')
      .order('name', { ascending: true });
    if (!projData) return;

    const projectIds = projData.map(p => p.id);
    const { data: itemsData } = await supabase
      .from('project_items')
      .select('project_id, name, value')
      .in('project_id', projectIds)
      .order('position', { ascending: true });

    const mapped: ProjectWithItems[] = projData.map(p => {
      const cl = clients.find(c => c.id === p.client_id);
      return {
        ...p,
        client_name: cl?.name,
        items: (itemsData || []).filter(i => i.project_id === p.id).map(i => ({ name: i.name, value: Number(i.value) })),
      };
    });
    setProjects(mapped);
  }, [user, clients]);

  const importProject = (project: ProjectWithItems) => {
    setClientId(project.client_id || '');
    setDueDate(project.due_date || '');
    setItems(
      project.items.length > 0
        ? project.items.map(i => ({ description: i.name, quantity: 1, unitPrice: i.value }))
        : [{ description: '', quantity: 1, unitPrice: 0 }]
    );
    setTaxes(0);
    setDiscount(0);
    setCreating(true);
    setImportDialogOpen(false);
    toast.success(lang === 'pt-BR' ? `Projeto "${project.name}" importado!` : `Project "${project.name}" imported!`);
  };

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

  // Pre-fill from Kanban integration
  useEffect(() => {
    const fromTask = searchParams.get('from_task');
    if (fromTask) {
      const desc = searchParams.get('desc') || '';
      const value = parseFloat(searchParams.get('value') || '0');
      const client = searchParams.get('client') || '';
      setItems([{ description: desc, quantity: 1, unitPrice: value }]);
      if (client) setClientId(client);
      setCreating(true);
      setSearchParams({}, { replace: true });
      toast.info('Fatura pré-preenchida a partir da tarefa!');
    }
  }, [searchParams, setSearchParams]);

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.invoices}</h1>
        {!creating && (
          <div className="flex items-center gap-2">
            <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (open) loadProjects(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FolderKanban className="w-4 h-4" />
                  {lang === 'pt-BR' ? 'Importar Projeto' : 'Import Project'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{lang === 'pt-BR' ? 'Importar Projeto' : 'Import Project'}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-3">
                  {lang === 'pt-BR' ? 'Selecione um projeto para importar os dados na fatura.' : 'Select a project to import data into the invoice.'}
                </p>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{lang === 'pt-BR' ? 'Nenhum projeto encontrado.' : 'No projects found.'}</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {projects.map((p) => {
                      const totalValue = p.items.reduce((sum, i) => sum + i.value, 0);
                      return (
                        <button
                          key={p.id}
                          onClick={() => importProject(p)}
                          className="w-full text-left p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.client_name || (lang === 'pt-BR' ? 'Sem cliente' : 'No client')}
                                {p.items.length > 0 && ` · ${p.items.length} ${p.items.length === 1 ? 'item' : 'itens'}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-foreground">R$ {totalValue.toFixed(2)}</p>
                              {p.due_date && <p className="text-[11px] text-muted-foreground">{p.due_date}</p>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> {t.newInvoice}
            </button>
          </div>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
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
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma fatura criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="font-semibold text-foreground">{inv.client_name || 'Sem cliente'} · {inv.items.length} itens</p>
                <p className="text-xs text-muted-foreground">Venc: {inv.due_date || '-'} · {new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">R$ {inv.total.toFixed(2)}</span>
                <Badge className={statusColors[inv.status]}>{statusLabel(inv.status)}</Badge>
                <button onClick={() => exportInvoicePdf(inv)} className="text-muted-foreground hover:text-primary" title="Exportar PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => deleteInvoice(inv.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
