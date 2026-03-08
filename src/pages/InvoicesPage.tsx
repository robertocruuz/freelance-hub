import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Receipt, Download, FolderKanban, Pencil, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { generateDocumentPdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
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
  payment_method: string | null;
  created_at: string;
}

interface ProjectWithItems {
  id: string;
  name: string;
  client_id: string | null;
  client_name?: string;
  due_date: string | null;
  discount: number;
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
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxes, setTaxes] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const { clients } = useClients();
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // New item input
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  // Editing item inline
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxesValue = subtotal * (taxes / 100);
  const discountValue = subtotal * (discount / 100);
  const total = subtotal + taxesValue - discountValue;

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data: projData } = await supabase
      .from('projects')
      .select('id, name, client_id, due_date, discount')
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
    if (project.due_date) setDueDate(new Date(project.due_date + 'T12:00:00'));
    setItems(
      project.items.length > 0
        ? project.items.map(i => ({ description: i.name, quantity: 1, unitPrice: i.value }))
        : []
    );
    setTaxes(0);
    setDiscount(project.discount || 0);
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

  const addItem = () => {
    if (!newDesc.trim()) return toast.error('Informe a descrição do item.');
    setItems(prev => [...prev, { description: newDesc.trim(), quantity: newQty, unitPrice: newPrice }]);
    setNewDesc('');
    setNewQty(1);
    setNewPrice(0);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const startEditItem = (idx: number) => {
    const item = items[idx];
    setEditingItemIdx(idx);
    setEditDesc(item.description);
    setEditQty(item.quantity);
    setEditPrice(item.unitPrice);
  };

  const saveEditItem = () => {
    if (editingItemIdx === null) return;
    setItems(prev => prev.map((item, i) => i === editingItemIdx ? { description: editDesc, quantity: editQty, unitPrice: editPrice } : item));
    setEditingItemIdx(null);
  };

  const cancelEditItem = () => setEditingItemIdx(null);

  const resetForm = () => {
    setCreating(false);
    setClientId('');
    setItems([]);
    setTaxes(0);
    setDiscount(0);
    setDueDate(undefined);
    setPaymentMethods([]);
    setOtherPaymentMethod('');
    setNotes('');
    setEditingItemIdx(null);
    setNewDesc('');
    setNewQty(1);
    setNewPrice(0);
  };

  const saveInvoice = async () => {
    if (!user) return;
    if (items.length === 0) return toast.error('Adicione pelo menos um item.');
    const { error } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: clientId || null,
      items: items as unknown as Json,
      total,
      taxes,
      discount,
      status: 'pending',
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      payment_method: [...paymentMethods, ...(paymentMethods.includes('Outro') && otherPaymentMethod.trim() ? [otherPaymentMethod.trim()] : [])].filter(m => m !== 'Outro').join(', ') || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.save + '!');
      resetForm();
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

  const inputClass = "px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

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
                   {lang === 'pt-BR' ? 'Importar Fatura' : 'Import Invoice'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{lang === 'pt-BR' ? 'Importar Fatura' : 'Import Invoice'}</DialogTitle>
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
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {/* Client & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.client}</label>
              <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.dueDate}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : (lang === 'pt-BR' ? 'Selecionar' : 'Select')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">{t.paymentMethod}</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {['Pix', 'Boleto', 'Cartão', 'Transferência bancária', 'Dinheiro', 'Outro'].map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPaymentMethods(prev => [...prev, method]);
                      } else {
                        setPaymentMethods(prev => prev.filter(m => m !== method));
                        if (method === 'Outro') setOtherPaymentMethod('');
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-primary accent-primary"
                  />
                  {method}
                </label>
              ))}
            </div>
            {paymentMethods.includes('Outro') && (
              <input
                placeholder={lang === 'pt-BR' ? 'Especifique a forma de pagamento...' : 'Specify payment method...'}
                value={otherPaymentMethod}
                onChange={(e) => setOtherPaymentMethod(e.target.value)}
                className={`${inputClass} w-full mt-1`}
              />
            )}
          </div>

          {/* Add items section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">{lang === 'pt-BR' ? 'Adicionar Itens' : 'Add Items'}</h3>
            <div className="grid grid-cols-[1fr_100px_120px_auto] gap-2 items-center">
              <input
                placeholder={t.description}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Qtd"
                min={1}
                value={newQty}
                onChange={(e) => setNewQty(Math.max(1, +e.target.value))}
                className={`${inputClass} text-center`}
              />
              <input
                type="number"
                placeholder={lang === 'pt-BR' ? 'Valor' : 'Price'}
                min={0}
                step={0.01}
                value={newPrice || ''}
                onChange={(e) => setNewPrice(+e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className={`${inputClass} text-right`}
              />
              <button
                onClick={addItem}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {lang === 'pt-BR' ? 'Adicionar' : 'Add'}
              </button>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-semibold text-foreground">{t.description}</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground w-20">Qtd</th>
                    <th className="text-right py-3 px-3 font-semibold text-foreground w-32">{lang === 'pt-BR' ? 'Valor Unit.' : 'Unit Price'}</th>
                    <th className="text-right py-3 px-3 font-semibold text-foreground w-32">Total</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground w-32">{lang === 'pt-BR' ? 'Ações' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {editingItemIdx === idx ? (
                        <>
                          <td className="py-2 px-3">
                            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={`${inputClass} w-full`} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Math.max(1, +e.target.value))} className={`${inputClass} w-full text-center`} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(+e.target.value)} className={`${inputClass} w-full text-right`} />
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-foreground">
                            R$ {(editQty * editPrice).toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={saveEditItem} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">{lang === 'pt-BR' ? 'Salvar' : 'Save'}</button>
                              <button onClick={cancelEditItem} className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90">{t.cancel}</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-foreground">{item.description}</td>
                          <td className="py-3 px-3 text-center text-muted-foreground">{item.quantity}</td>
                          <td className="py-3 px-3 text-right text-muted-foreground">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-medium text-foreground">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => startEditItem(idx)} className="px-3 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold hover:opacity-90">{lang === 'pt-BR' ? 'Editar' : 'Edit'}</button>
                              <button onClick={() => removeItem(idx)} className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90">{lang === 'pt-BR' ? 'Excluir' : 'Delete'}</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Taxes, Discount & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.taxes} (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxes}
                onChange={(e) => setTaxes(Math.min(100, Math.max(0, +e.target.value)))}
                className={`${inputClass} w-full max-w-[200px]`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.discount} (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value)))}
                className={`${inputClass} w-full max-w-[200px]`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{lang === 'pt-BR' ? 'Observação' : 'Notes'}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={lang === 'pt-BR' ? 'Observações sobre a fatura...' : 'Invoice notes...'}
              className={`${inputClass} w-full resize-y`}
            />
          </div>

          {/* Summary & actions */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
            {taxes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.taxes} ({taxes}%)</span>
                <span className="text-foreground">+ R$ {taxesValue.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.discount} ({discount}%)</span>
                <span className="text-destructive">- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm">{t.cancel}</button>
              <button onClick={saveInvoice} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 && !creating ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{lang === 'pt-BR' ? 'Nenhuma fatura criada ainda.' : 'No invoices yet.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="font-semibold text-foreground">{inv.client_name || (lang === 'pt-BR' ? 'Sem cliente' : 'No client')} · {inv.items.length} {inv.items.length === 1 ? 'item' : 'itens'}</p>
                <p className="text-xs text-muted-foreground">
                  {lang === 'pt-BR' ? 'Venc' : 'Due'}: {inv.due_date || '-'} · {new Date(inv.created_at).toLocaleDateString()}
                </p>
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
