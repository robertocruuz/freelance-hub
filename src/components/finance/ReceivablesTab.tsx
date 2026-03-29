import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, Receipt, Download, FolderKanban, Pencil, CalendarIcon, ChevronDown, MoreVertical, AlertTriangle, Repeat } from 'lucide-react';
import { format, isPast, isToday, addDays, isBefore, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, getContrastYIQ } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { generateInvoicePdf } from '@/lib/pdfGenerator';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import ClientSelect from '@/components/ClientSelect';
import { useClients } from '@/hooks/useClients';
import type { FinanceInvoice, InvoicePrefillDraft } from '@/pages/FinancePage';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  name: string | null;
  client_id: string | null;
  client_name?: string;
  project_id?: string | null;
  items: InvoiceItem[];
  total: number;
  taxes: number;
  discount: number;
  status: string;
  due_date: string | null;
  payment_method: string | null;
  created_at: string;
  is_recurring: boolean;
  recurring_months: number | null;
  recurring_group_id?: string | null;
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

const statusDots: Record<string, string> = {
  pending: 'bg-amber-500',
  paid: 'bg-primary',
  overdue: 'bg-destructive',
};

interface Props {
  invoices: FinanceInvoice[];
  onRefresh: () => void;
  monthFilter?: string;
  autoEditId?: string | null;
  onAutoEditDone?: () => void;
  prefillDraft?: InvoicePrefillDraft | null;
  onPrefillApplied?: () => void;
}

export default function ReceivablesTab({
  invoices: parentInvoices,
  onRefresh,
  monthFilter,
  autoEditId,
  onAutoEditDone,
  prefillDraft,
  onPrefillApplied,
}: Props) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { clients } = useClients();
  const [creating, setCreating] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [invoiceName, setInvoiceName] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxes, setTaxes] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState('12');
  const [recurringGroupId, setRecurringGroupId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importExpanded, setImportExpanded] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    supabase.from('organizations').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setOrganization(data);
    });
  }, [user]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data: projData } = await supabase
      .from('projects')
      .select('id, name, client_id, due_date, discount')
      .eq('is_archived', false)
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
    setInvoiceName(project.name);
    setClientId(project.client_id || '');
    setProjectId(project.id);
    if (project.due_date) setDueDate(new Date(project.due_date + 'T12:00:00'));
    setItems(
      project.items.length > 0
        ? project.items.map(i => ({ description: i.name, quantity: 1, unitPrice: i.value }))
        : []
    );
    setTaxes(0);
    setDiscount(project.discount || 0);
    setCreating(true);
    setImportExpanded(false);
    toast.success(`Projeto "${project.name}" importado!`);
  };

  // Use parent invoices mapped to internal format
  const mappedInvoices = useMemo(() => {
    return parentInvoices.map(inv => {
      const cl = clients.find(c => c.id === inv.client_id);
      return {
        ...inv,
        client_name: cl?.name,
        // Parent invoices don't have full items, so we'll cast it or handle it based on usage
        items: [] as InvoiceItem[], 
      } as unknown as Invoice;
    });
  }, [parentInvoices, clients]);



  // Auto-edit from calendar click
  const autoEditProcessed = useRef<string | null>(null);
  useEffect(() => {
    if (autoEditId && autoEditId !== autoEditProcessed.current && mappedInvoices.length > 0) {
      const inv = mappedInvoices.find(i => i.id === autoEditId);
      if (inv) {
        autoEditProcessed.current = autoEditId;
        editInvoice(inv);
        onAutoEditDone?.();
      }
    }
  }, [autoEditId, mappedInvoices]);

  const prefillProcessed = useRef<string | null>(null);
  useEffect(() => {
    if (!prefillDraft || prefillDraft.sourceTaskId === prefillProcessed.current) return;

    prefillProcessed.current = prefillDraft.sourceTaskId;
    setCreating(true);
    setEditingInvoiceId(null);
    setInvoiceName(prefillDraft.invoiceName || '');
    setClientId(prefillDraft.clientId || '');
    setProjectId(prefillDraft.projectId || null);
    setItems(prefillDraft.items);
    setTaxes(0);
    setDiscount(0);
    setDueDate(prefillDraft.dueDate ? new Date(prefillDraft.dueDate + 'T12:00:00') : undefined);
    setPaymentMethods([]);
    setOtherPaymentMethod('');
    setNotes('');
    setIsRecurring(false);
    setRecurringMonths('12');
    setRecurringGroupId(null);
    setEditingItemIdx(null);
    setNewDesc('');
    setNewQty(1);
    setNewPrice(0);
    toast.success('Fatura pré-preenchida a partir da tarefa!');
    onPrefillApplied?.();
  }, [prefillDraft, onPrefillApplied]);

  // Filter by month
  const monthInvoices = monthFilter
    ? mappedInvoices.filter(inv => (inv.due_date && inv.due_date.startsWith(monthFilter)) || (!inv.due_date && inv.created_at.startsWith(monthFilter)))
    : mappedInvoices;

  // Auto-update overdue invoices
  useEffect(() => {
    const overdueIds = mappedInvoices
      .filter(inv => inv.status === 'pending' && inv.due_date && isPast(new Date(inv.due_date + 'T23:59:59')) && !isToday(new Date(inv.due_date + 'T12:00:00')))
      .map(inv => inv.id);
    if (overdueIds.length > 0) {
      Promise.all(overdueIds.map(id => supabase.from('invoices').update({ status: 'overdue' }).eq('id', id)))
        .then(() => { onRefresh(); });
    }
  }, [mappedInvoices, onRefresh]);

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
    setEditingInvoiceId(null);
    setInvoiceName('');
    setClientId('');
    setProjectId(null);
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
    setIsRecurring(false);
    setRecurringMonths('12');
    setRecurringGroupId(null);
  };

  const editInvoice = async (inv: Invoice) => {
    // Fetch full invoice because mappedInvoices doesn't have items
    const { data: fullInv } = await supabase.from('invoices').select('*').eq('id', inv.id).single();
    if (!fullInv) return toast.error('Fatura não encontrada.');
    
    setEditingInvoiceId(fullInv.id);
    setInvoiceName(fullInv.name || '');
    setClientId(fullInv.client_id || '');
    setProjectId(fullInv.project_id || null);
    setItems((Array.isArray(fullInv.items) ? fullInv.items : []) as unknown as InvoiceItem[]);
    setTaxes(fullInv.taxes);
    setDiscount(fullInv.discount);
    setDueDate(fullInv.due_date ? new Date(fullInv.due_date + 'T12:00:00') : undefined);
    setPaymentMethods(fullInv.payment_method ? fullInv.payment_method.split(', ') : []);
    setIsRecurring(fullInv.is_recurring || false);
    setRecurringMonths(String(fullInv.recurring_months || 12));
    setRecurringGroupId((fullInv as any).recurring_group_id || null);
    setCreating(true);
  };

  const saveInvoice = async () => {
    if (!user) return;
    if (items.length === 0) return toast.error('Adicione pelo menos um item.');
    const groupId = recurringGroupId || (isRecurring ? crypto.randomUUID() : null);
    const invoiceData = {
      name: invoiceName.trim() || null,
      client_id: clientId || null,
      project_id: projectId || null,
      items: items as unknown as Json,
      total,
      taxes,
      discount,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      payment_method: [...paymentMethods, ...(paymentMethods.includes('Outro') && otherPaymentMethod.trim() ? [otherPaymentMethod.trim()] : [])].filter(m => m !== 'Outro').join(', ') || null,
      is_recurring: isRecurring,
      recurring_months: isRecurring ? parseInt(recurringMonths) || 12 : null,
      recurring_group_id: isRecurring ? groupId : null,
    };

    let error;
    if (editingInvoiceId) {
      ({ error } = await supabase.from('invoices').update(invoiceData).eq('id', editingInvoiceId));
      
      if (!error && invoiceData.recurring_group_id && invoiceData.is_recurring && invoiceData.recurring_months && invoiceData.due_date) {
        await supabase.from('invoices').delete()
          .eq('recurring_group_id', invoiceData.recurring_group_id)
          .gt('due_date', invoiceData.due_date);

        const invoicesToInsert: any[] = [];
        const baseDate = new Date(invoiceData.due_date + 'T12:00:00');
        for (let i = 1; i < invoiceData.recurring_months; i++) {
          invoicesToInsert.push({
            ...invoiceData,
            user_id: user.id,
            status: 'pending',
            due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
          });
        }
        if (invoicesToInsert.length > 0) {
          await supabase.from('invoices').insert(invoicesToInsert);
        }
      }
    } else {
      if (isRecurring && invoiceData.recurring_months) {
        const invoicesToInsert: any[] = [];
        const baseDate = dueDate || new Date();
        for (let i = 0; i < invoiceData.recurring_months; i++) {
          invoicesToInsert.push({
            ...invoiceData,
            user_id: user.id,
            status: 'pending',
            due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
          });
        }
        ({ error } = await supabase.from('invoices').insert(invoicesToInsert));
      } else {
        ({ error } = await supabase.from('invoices').insert({ ...invoiceData, user_id: user.id, status: 'pending' }));
      }
    }
    if (error) toast.error(error.message);
    else {
      toast.success(editingInvoiceId ? 'Fatura atualizada!' : 'Fatura salva!');
      resetForm();
      onRefresh();
    }
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id);
    onRefresh();
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Status atualizado!');
      onRefresh();
    }
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = { pending: 'Pendente', paid: 'Recebido', overdue: 'Atrasado' };
    return labels[s] || s;
  };

  const exportInvoicePdf = async (inv: Invoice) => {
    // Fetch full invoice because mappedInvoices doesn't have items
    const { data: fullInv } = await supabase.from('invoices').select('*').eq('id', inv.id).single();
    if (!fullInv) return toast.error('Fatura não encontrada.');
    
    const client = clients.find(c => c.id === inv.client_id) || null;
    await generateInvoicePdf({
      invoiceName: fullInv.name,
      items: (Array.isArray(fullInv.items) ? fullInv.items : []) as unknown as InvoiceItem[],
      total: fullInv.total,
      taxes: fullInv.taxes,
      discount: fullInv.discount,
      status: statusLabel(fullInv.status),
      dueDate: fullInv.due_date,
      paymentMethod: fullInv.payment_method,
      createdAt: fullInv.created_at,
      organization: organization,
      client: client,
    });
  };

  // Near due warning
  const nearDue = monthInvoices.filter(inv =>
    inv.status === 'pending' && inv.due_date &&
    isBefore(new Date(inv.due_date + 'T12:00:00'), addDays(new Date(), 3)) &&
    !isPast(new Date(inv.due_date + 'T23:59:59'))
  );

  const clientNameFn = (id: string | null) => clients.find(c => c.id === id)?.name || '';
  const clientColorFn = (id: string | null) => (clients.find(c => c.id === id) as any)?.color || null;

  return (
    <div className="relative h-full flex flex-col">
      {/* Action Buttons (Absolute Top Right) */}
      {!creating && (
        <div className="absolute -top-12 right-0 flex items-center gap-2 z-10">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl bg-background hover:bg-muted"
            onClick={async () => {
              const next = !importExpanded;
              setImportExpanded(next);
              if (next) await loadProjects();
            }}
          >
                <FolderKanban className="w-4 h-4" />
                <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button onClick={() => setCreating(true)} size="sm" className="gap-1.5 rounded-xl font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Nova Fatura
          </Button>
        </div>
      )}

      {/* Main Card Content */}
      <div className="border border-border bg-card rounded-2xl p-4 sm:p-6 flex-1 flex flex-col">
        <div className="space-y-5">
          {importExpanded && !creating && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Importar de Projeto</h2>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setImportExpanded(false)}>
                  Cancelar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione um projeto para importar os dados na fatura.
              </p>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <FolderKanban className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum projeto encontrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {projects.map((p) => {
                    const totalValue = p.items.reduce((sum, i) => sum + i.value, 0);
                    const alreadyImported = mappedInvoices.some(inv => inv.project_id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => alreadyImported ? toast.error('Este projeto já foi importado como fatura.') : importProject(p)}
                        disabled={alreadyImported}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border border-border transition-all",
                          alreadyImported ? "opacity-50 cursor-not-allowed bg-muted/10" : "bg-card hover:bg-muted/50 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FolderKanban className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                                {p.name}
                                {alreadyImported && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Já importado</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.client_name || 'Sem cliente'}
                                {p.items.length > 0 && ` · ${p.items.length} ${p.items.length === 1 ? 'item' : 'itens'}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm text-foreground tabular-nums">{formatCurrency(totalValue)}</p>
                            {p.due_date && <p className="text-[11px] text-muted-foreground">{format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* Near due warning */}
          {nearDue.length > 0 && !creating && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 p-4" role="alert">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {nearDue.length} fatura{nearDue.length > 1 ? 's' : ''} vence{nearDue.length > 1 ? 'm' : ''} em breve
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/60">Nos próximos 3 dias</p>
              </div>
            </div>
          )}

          {/* Form Header (only when creating) */}
          {creating && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingInvoiceId ? 'Editar Fatura' : 'Nova Fatura'}
              </h2>
            </div>
          )}

      {/* Create/Edit Form */}
      {creating && (
        <div className="space-y-5 animate-fade-in">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome da Fatura</label>
            <Input
              placeholder="Ex: Projeto Website"
              value={invoiceName}
              onChange={(e) => setInvoiceName(e.target.value)}
              className="rounded-[8px]"
            />
          </div>

          {/* Client & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <ClientSelect value={clientId} onChange={setClientId} placeholder="Selecionar cliente" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Vencimento</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full h-10 px-3 rounded-[8px] bg-background border border-input text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecionar data'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Forma de Pagamento</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {['Pix', 'Boleto', 'Cartão', 'Transferência bancária', 'Dinheiro', 'Outro'].map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <Checkbox
                    checked={paymentMethods.includes(method)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPaymentMethods(prev => [...prev, method]);
                      } else {
                        setPaymentMethods(prev => prev.filter(m => m !== method));
                        if (method === 'Outro') setOtherPaymentMethod('');
                      }
                    }}
                  />
                  {method}
                </label>
              ))}
            </div>
            {paymentMethods.includes('Outro') && (
              <Input
                placeholder="Especifique a forma de pagamento..."
                value={otherPaymentMethod}
                onChange={(e) => setOtherPaymentMethod(e.target.value)}
                className="rounded-[8px] mt-1"
              />
            )}
          </div>

          {/* Add items section */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Itens da Fatura</label>
            <div className="grid grid-cols-[1fr_70px_100px_auto] gap-2 items-end">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Descrição</span>
                <Input
                  placeholder="Descrição do item"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  className="rounded-[8px]"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Qtd</span>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(1, +e.target.value))}
                  className="rounded-[8px] text-center"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Valor</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  min={0}
                  step={0.01}
                  value={newPrice || ''}
                  onChange={(e) => setNewPrice(+e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  className="rounded-[8px] text-right"
                />
              </div>
              <Button onClick={addItem} size="sm" className="rounded-xl h-10">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">Qtd</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Unit.</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Total</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      {editingItemIdx === idx ? (
                        <>
                          <td className="py-2 px-3">
                            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="rounded-lg h-8 text-sm" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Math.max(1, +e.target.value))} className="rounded-lg h-8 text-sm text-center" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(+e.target.value)} className="rounded-lg h-8 text-sm text-right" />
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-foreground tabular-nums">
                            {formatCurrency(editQty * editPrice)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button onClick={saveEditItem} size="sm" variant="default" className="h-7 px-2 text-[11px] rounded-lg">OK</Button>
                              <Button onClick={cancelEditItem} size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-lg">✕</Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-foreground font-medium">{item.description}</td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-foreground tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button onClick={() => startEditItem(idx)} size="icon" variant="ghost" className="w-7 h-7 rounded-lg">
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </Button>
                              <Button onClick={() => removeItem(idx)} size="icon" variant="ghost" className="w-7 h-7 rounded-lg hover:bg-destructive/10">
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Impostos (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxes || ''}
                onChange={(e) => setTaxes(Math.min(100, Math.max(0, +e.target.value)))}
                placeholder="0"
                className="w-40 rounded-[8px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Desconto (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value)))}
                placeholder="0"
                className="w-40 rounded-[8px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Observação</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre a fatura..."
              className="rounded-[8px]"
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring(!isRecurring)}
              className={cn(
                'w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 bg-background/95 text-primary shadow-sm dark:border-white/20 dark:bg-card dark:hover:border-white/40',
                isRecurring ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/60'
              )}
            >
              {isRecurring && <Repeat className="w-3 h-3" />}
            </button>
            <div className="flex-1">
              <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>Fatura recorrente</Label>
              <p className="text-xs text-muted-foreground">Repetir automaticamente nos próximos meses</p>
            </div>
          </div>
          {isRecurring && (
            <div className="ml-8">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duração da recorrência</Label>
              <Select value={recurringMonths} onValueChange={setRecurringMonths}>
                <SelectTrigger className="mt-1.5 w-48 rounded-[8px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary & actions */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {taxes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Impostos ({taxes}%)</span>
                <span className="text-foreground tabular-nums">+ {formatCurrency(taxesValue)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({discount}%)</span>
                <span className="text-destructive tabular-nums">- {formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={resetForm} className="flex-1 rounded-xl font-semibold">
              Cancelar
            </Button>
            <Button onClick={saveInvoice} className="flex-1 rounded-xl font-semibold">
              {editingInvoiceId ? 'Salvar alterações' : 'Salvar fatura'}
            </Button>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {monthInvoices.length === 0 && !creating && !importExpanded ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center mb-2">
            <Receipt className="w-8 h-8 text-muted-foreground/70" />
          </div>
          <p className="text-sm font-medium">Nenhuma fatura criada ainda</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Clique em "Nova Fatura" para começar.</p>
        </div>
      ) : monthInvoices.length > 0 ? (
        <>
          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary shadow-none'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {s === 'all' ? `Todos (${monthInvoices.length})` : statusLabel(s)}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {(() => {
              const filtered = statusFilter === 'all' ? monthInvoices : monthInvoices.filter(inv => inv.status === statusFilter);
              const grouped: Record<string, Invoice[]> = {};
              filtered.forEach(inv => {
                const key = inv.client_id || '__no_client__';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(inv);
              });
              const sortedKeys = Object.keys(grouped).sort((a, b) => {
                if (a === '__no_client__') return 1;
                if (b === '__no_client__') return -1;
                return clientNameFn(a).localeCompare(clientNameFn(b));
              });

              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-sm">Nenhuma fatura neste filtro.</p>
                  </div>
                );
              }

              return sortedKeys.map(key => {
                const color = key !== '__no_client__' ? clientColorFn(key) : null;
                return (
                    <div key={key} className="space-y-2">
                      {grouped[key].map((inv) => {
                        const isOverdue = inv.status === 'overdue';
                        const contrast = color ? getContrastYIQ(color) : 'dark';
                        const isLight = contrast === 'light';
                        const hoverText = color ? (isLight ? 'group-hover:text-white' : 'group-hover:text-slate-900') : '';
                        const hoverMuted = color ? (isLight ? 'group-hover:text-white/85' : 'group-hover:text-slate-700') : '';
                        const hoverIconButton = color ? (isLight ? 'group-hover:text-white group-hover:hover:bg-white/20' : 'group-hover:text-slate-900 group-hover:hover:bg-slate-900/10') : '';
                        return (
                          <div
                            key={inv.id}
                          className={cn(
                            "rounded-xl border overflow-hidden transition-all duration-200 group relative",
                            isOverdue && "border-destructive/20"
                          )}
                          style={color
                            ? { backgroundColor: `${color}08`, borderColor: isOverdue ? undefined : `${color}30` }
                            : { backgroundColor: 'hsl(var(--card) / 0.4)', borderColor: isOverdue ? undefined : 'hsl(var(--border))' }
                          }
                        >
                            {color && (
                              <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                style={{ backgroundColor: color }}
                              />
                            )}
                            <div className="relative z-10 flex items-center justify-between p-4">
                              <div className="min-w-0 flex-1">
                                <p className={cn("font-semibold text-foreground truncate", hoverText)}>
                                  {inv.name || inv.client_name || 'Sem nome'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {inv.client_name && inv.name && (
                                    <span className={cn("text-xs text-muted-foreground", hoverMuted)}>{inv.client_name}</span>
                                  )}
                                  {inv.due_date && (
                                    <>
                                      <span className={cn("text-xs text-muted-foreground", hoverMuted)}>·</span>
                                      <span className={cn(
                                        "text-xs flex items-center gap-1",
                                        isOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                                        !isOverdue && hoverMuted
                                      )}>
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(new Date(inv.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                      </span>
                                    </>
                                  )}
                                  {inv.is_recurring && (
                                    <>
                                      <span className={cn("text-xs text-muted-foreground", hoverMuted)}>·</span>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-primary/10 text-primary border-primary/30">
                                        <Repeat className="w-2.5 h-2.5" />
                                        {inv.recurring_months}x
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0" onClick={e => e.stopPropagation()}>
                                <span className={cn("font-semibold text-primary tabular-nums text-sm", color && hoverText)}>
                                  {formatCurrency(inv.total)}
                                </span>
                                {/* Status dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <button className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10px] font-semibold transition-all hover:opacity-80 cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                    statusColors[inv.status]
                                  )}>
                                      {statusLabel(inv.status)}
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-[8px]">
                                  {['pending', 'paid', 'overdue'].map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() => updateInvoiceStatus(inv.id, s)}
                                      className={cn("gap-2 rounded-[4px]", inv.status === s && "font-bold")}
                                    >
                                      <span className={cn("w-2 h-2 rounded-full shrink-0", statusDots[s])} />
                                      {statusLabel(s)}
                                    </DropdownMenuItem>
                                  ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg", hoverIconButton)} onClick={() => editInvoice(inv)} title="Editar">
                                  <Pencil className={cn("w-3.5 h-3.5 text-muted-foreground", color && hoverText)} />
                                </Button>
                                <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg", hoverIconButton)} onClick={() => exportInvoicePdf(inv)} title="Exportar PDF">
                                  <Download className={cn("w-3.5 h-3.5 text-muted-foreground", color && hoverText)} />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg", hoverIconButton)}>
                                      <MoreVertical className={cn("w-3.5 h-3.5 text-muted-foreground", color && hoverText)} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => editInvoice(inv)} className="gap-2">
                                      <Pencil className="w-4 h-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive gap-2">
                                          <Trash2 className="w-4 h-4" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir fatura?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. A fatura será permanentemente excluída.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteInvoice(inv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                );
              });
            })()}
          </div>
        </>
      ) : null}
        </div>
      </div>
    </div>
  );
}

