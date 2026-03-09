import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, ChevronRight, FolderInput, FolderKanban, CalendarIcon, MoreVertical, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateDocumentPdf, generateBudgetPdf } from '@/lib/pdfGenerator';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BudgetItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Budget {
  id: string;
  client_id: string | null;
  client_name?: string;
  name: string | null;
  budget_date: string | null;
  validity_date: string | null;
  delivery_date: string | null;
  items: BudgetItem[];
  total: number;
  discount: number;
  notes: string | null;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expandedBudget, setExpandedBudget] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [budgetName, setBudgetName] = useState('');
  const [budgetDate, setBudgetDate] = useState<Date | undefined>(new Date());
  const [validityDate, setValidityDate] = useState<Date | undefined>(undefined);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const { clients } = useClients();
  const [organization, setOrganization] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('organizations').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setOrganization(data);
    });
  }, [user]);

  // New item input state
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  // Editing item inline
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);

  // Project import state
  interface ProjectOption { id: string; name: string; client_id: string | null; }
  const [projectPickerItem, setProjectPickerItem] = useState<{ item: BudgetItem | null; budget: Budget } | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [importedItemKeys, setImportedItemKeys] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discountValue = subtotal * (discount / 100);
  const total = subtotal - discountValue;

  const makeItemKey = (name: string, value: number) => `${name}|${value.toFixed(2)}`;

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
          name: (b as any).name ?? null,
          budget_date: (b as any).budget_date ?? null,
          validity_date: (b as any).validity_date ?? null,
          delivery_date: (b as any).delivery_date ?? null,
          discount: (b as any).discount ?? 0,
          notes: (b as any).notes ?? null,
          items: (Array.isArray(b.items) ? b.items : []) as unknown as BudgetItem[],
        };
      }));
    }
  }, [user, clients]);

  const loadImportedItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('project_items').select('name, value');
    if (data) {
      const keys = new Set(data.map(d => makeItemKey(d.name, Number(d.value))));
      setImportedItemKeys(keys);
    }
  }, [user]);

  useEffect(() => { loadBudgets(); loadImportedItems(); }, [loadBudgets, loadImportedItems]);

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
      toast.info('Orçamento pré-preenchido a partir da tarefa!');
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

  const saveBudget = async () => {
    if (!user) return;
    if (items.length === 0) return toast.error('Adicione pelo menos um item.');

    const payload = {
      client_id: clientId || null,
      name: budgetName || null,
      budget_date: budgetDate ? format(budgetDate, 'yyyy-MM-dd') : null,
      validity_date: validityDate ? format(validityDate, 'yyyy-MM-dd') : null,
      delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
      items: items as unknown as Json,
      total,
      discount,
      notes: notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from('budgets').update(payload).eq('id', editingId);
      if (error) toast.error(error.message);
      else { toast.success(t.save + '!'); resetForm(); loadBudgets(); }
    } else {
      const { error } = await supabase.from('budgets').insert({
        ...payload,
        user_id: user.id,
        status: 'draft',
      });
      if (error) toast.error(error.message);
      else { toast.success(t.save + '!'); resetForm(); loadBudgets(); }
    }
  };

  const resetForm = () => {
    setCreating(false);
    setEditingId(null);
    setClientId('');
    setBudgetName('');
    setBudgetDate(new Date());
    setValidityDate(undefined);
    setDeliveryDate(undefined);
    setItems([]);
    setDiscount(0);
    setNotes('');
    setEditingItemIdx(null);
  };

  const startEditing = (b: Budget) => {
    setEditingId(b.id);
    setClientId(b.client_id || '');
    setBudgetName(b.name || '');
    setBudgetDate(b.budget_date ? new Date(b.budget_date + 'T12:00:00') : new Date());
    setValidityDate(b.validity_date ? new Date(b.validity_date + 'T12:00:00') : undefined);
    setDeliveryDate(b.delivery_date ? new Date(b.delivery_date + 'T12:00:00') : undefined);
    setItems(b.items.length > 0 ? b.items : []);
    setDiscount(b.discount || 0);
    setNotes(b.notes || '');
    setCreating(true);
  };

  const changeStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('budgets').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(statusLabel(status)); loadBudgets(); }
  };

  const deleteBudget = async (id: string) => {
    await supabase.from('budgets').delete().eq('id', id);
    loadBudgets();
  };

  const statusLabel = (s: string) => (t as any)[s] || s;

  const exportBudgetPdf = async (b: Budget) => {
    const client = clients.find(c => c.id === b.client_id) || null;
    await generateBudgetPdf({
      budgetName: b.name,
      budgetDate: b.budget_date,
      validityDate: b.validity_date,
      deliveryDate: b.delivery_date,
      items: b.items,
      total: b.total,
      discount: b.discount,
      notes: b.notes,
      status: b.status,
      organization: organization,
      client: client,
    });
  };

  const createTaskFromItem = (item: BudgetItem, budget: Budget) => {
    const params = new URLSearchParams({
      from_budget: 'true',
      title: item.description,
      value: String(item.quantity * item.unitPrice),
      ...(budget.client_id ? { client: budget.client_id } : {}),
    });
    navigate(`/dashboard/kanban?${params.toString()}`);
  };

  const openProjectPicker = async (item: BudgetItem | null, budget: Budget) => {
    setProjectPickerItem({ item, budget });
    const query = supabase.from('projects').select('id, name, client_id').order('name');
    if (budget.client_id) query.eq('client_id', budget.client_id);
    const { data } = await query;
    setAvailableProjects((data || []) as ProjectOption[]);
  };

  const addItemToProject = async (projectId: string) => {
    if (!projectPickerItem) return;
    const { item, budget } = projectPickerItem;
    
    if (item) {
      const { error } = await supabase.from('project_items').insert({
        project_id: projectId,
        name: item.description,
        value: item.quantity * item.unitPrice,
        position: 0,
      });
      if (error) return toast.error(error.message);
      toast.success(`"${item.description}" adicionado ao projeto!`);
    } else {
      const inserts = budget.items.map((bi, idx) => ({
        project_id: projectId,
        name: bi.description,
        value: bi.quantity * bi.unitPrice,
        position: idx,
      }));
      const { error } = await supabase.from('project_items').insert(inserts);
      if (error) return toast.error(error.message);
      toast.success(`${inserts.length} itens enviados ao projeto!`);
    }
    setProjectPickerItem(null);
    loadImportedItems();
  };

  const isFormOpen = creating || editingId;

  const clientNameFn = (id: string | null) => clients.find(c => c.id === id)?.name || '';
  const clientColorFn = (id: string | null) => (clients.find(c => c.id === id) as any)?.color || null;

  const filteredBudgets = budgets.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch = !search || 
      (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.client_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.budgets}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {budgets.length} {budgets.length === 1 ? 'orçamento' : 'orçamentos'}
          </p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => setCreating(true)}
            className="gap-2 rounded-xl font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t.newBudget}
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      {!isFormOpen && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', ...statuses].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {s === 'all' ? 'Todos' : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm animate-fade-in">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? 'Editar Orçamento' : t.newBudget}
          </h2>

          {/* Budget name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Orçamento</label>
            <Input
              placeholder="Ex: Projeto Website Corporativo"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Client select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full h-10 px-3 rounded-xl bg-background border border-input text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                      !budgetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {budgetDate ? format(budgetDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={budgetDate} onSelect={setBudgetDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Validade</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full h-10 px-3 rounded-xl bg-background border border-input text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                      !validityDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {validityDate ? format(validityDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={validityDate} onSelect={setValidityDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prazo de Entrega</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full h-10 px-3 rounded-xl bg-background border border-input text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                      !deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {deliveryDate ? format(deliveryDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Add items section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Adicionar Itens</h3>
            <div className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <Input
                  placeholder={t.description}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  className="rounded-lg h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Qtd</label>
                <Input
                  type="number"
                  min={1}
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(1, +e.target.value))}
                  className="rounded-lg h-9 text-sm text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Valor</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPrice || ''}
                  onChange={(e) => setNewPrice(+e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  className="rounded-lg h-9 text-sm text-right"
                />
              </div>
              <Button size="sm" className="h-9 rounded-lg text-xs" onClick={addItem}>
                Adicionar
              </Button>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs">{t.description}</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs w-20">Qtd</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground text-xs w-28">Valor Unit.</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground text-xs w-28">Total</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs w-28">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      {editingItemIdx === idx ? (
                        <>
                          <td className="py-2 px-3">
                            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8 rounded-lg text-sm" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Math.max(1, +e.target.value))} className="h-8 rounded-lg text-sm text-center" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(+e.target.value)} className="h-8 rounded-lg text-sm text-right" />
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-foreground tabular-nums">
                            {formatCurrency(editQty * editPrice)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button size="sm" className="h-7 rounded-lg text-xs" onClick={saveEditItem}>Salvar</Button>
                              <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs" onClick={cancelEditItem}>Cancelar</Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-foreground">{item.description}</td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={() => startEditItem(idx)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
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

          {/* Discount & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Desconto (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value)))}
                className="w-40 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Observação</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre o orçamento..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y text-foreground"
            />
          </div>

          {/* Summary & actions */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({discount}%)</span>
                <span className="text-destructive tabular-nums">- {formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="ghost" onClick={resetForm} className="rounded-xl font-semibold">
                {t.cancel}
              </Button>
              <Button onClick={saveBudget} className="rounded-xl font-semibold">
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Budget list */}
      {!isFormOpen && filteredBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">Nenhum orçamento encontrado.</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            {search || statusFilter !== 'all' ? 'Tente alterar os filtros de busca.' : 'Crie um orçamento para começar.'}
          </p>
        </div>
      ) : !isFormOpen ? (
        <div className="space-y-8">
          {(() => {
            const grouped: Record<string, Budget[]> = {};
            filteredBudgets.forEach(b => {
              const key = b.client_id || '__no_client__';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(b);
            });
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === '__no_client__') return 1;
              if (b === '__no_client__') return -1;
              return clientNameFn(a).localeCompare(clientNameFn(b));
            });

            return sortedKeys.map(key => {
              const color = key !== '__no_client__' ? clientColorFn(key) : null;
              return (
                <div key={key} className="space-y-2.5">
                  {/* Client group header */}
                  <div className="flex items-center gap-2 px-1">
                    {color && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    )}
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {key === '__no_client__' ? 'Sem cliente' : clientNameFn(key)}
                    </h2>
                    <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                      {grouped[key].length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {grouped[key].map((b) => {
                      const isExpanded = expandedBudget === b.id;
                      const color = clientColorFn(b.client_id);

                      return (
                        <div
                          key={b.id}
                          className={cn(
                            "rounded-xl border overflow-hidden transition-all duration-200",
                            isExpanded ? "shadow-md" : "hover:shadow-sm"
                          )}
                          style={color
                            ? { backgroundColor: `${color}08`, borderColor: `${color}30`, borderLeftWidth: '3px', borderLeftColor: color }
                            : { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }
                          }
                        >
                          {/* Budget header */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer group"
                            onClick={() => setExpandedBudget(isExpanded ? null : b.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"
                              )}>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">
                                  {b.name || b.client_name || 'Sem nome'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {b.client_name && b.name && (
                                    <span className="text-xs text-muted-foreground">{b.client_name}</span>
                                  )}
                                  {(b.client_name && b.name) && <span className="text-xs text-muted-foreground">·</span>}
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {b.budget_date ? format(new Date(b.budget_date + 'T12:00:00'), 'dd/MM/yyyy') : new Date(b.created_at).toLocaleDateString()}
                                  </span>
                                  {b.validity_date && (
                                    <>
                                      <span className="text-xs text-muted-foreground">·</span>
                                      <span className="text-xs text-muted-foreground">
                                        Val: {format(new Date(b.validity_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs font-medium text-foreground/80">
                                    {b.items.length} {b.items.length === 1 ? 'item' : 'itens'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <span className="font-semibold text-primary tabular-nums text-sm">
                                {formatCurrency(b.total)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80 cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                    statusColors[b.status]
                                  )}>
                                    {statusLabel(b.status)}
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {statuses.map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() => changeStatus(b.id, s)}
                                      className={cn("gap-2", b.status === s && 'font-bold')}
                                    >
                                      <span className={cn("w-2 h-2 rounded-full shrink-0", statusColors[s])} />
                                      {statusLabel(s)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => startEditing(b)} title="Editar">
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => exportBudgetPdf(b)} title="Exportar PDF">
                                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => openProjectPicker(null, b)} title="Enviar para projeto">
                                <FolderInput className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDeleteConfirmId(b.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && b.items.length > 0 && (
                            <div className="border-t border-border/50 px-4 pb-4 pt-3 animate-fade-in">
                              <div className="rounded-xl border border-border overflow-hidden">
                                <div className="grid grid-cols-[1fr_60px_90px_90px] gap-2 text-[11px] font-semibold text-muted-foreground px-3 py-2 bg-muted/50">
                                  <span>{t.description}</span>
                                  <span className="text-center">Qtd</span>
                                  <span className="text-right">Unit.</span>
                                  <span className="text-right">Subtotal</span>
                                </div>
                                {b.items.map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-[1fr_60px_90px_90px] gap-2 items-center text-sm px-3 py-2 border-t border-border/50 hover:bg-muted/30 transition-colors">
                                    <span className="text-foreground truncate">{item.description || '—'}</span>
                                    <span className="text-center text-muted-foreground tabular-nums">{item.quantity}</span>
                                    <span className="text-right text-muted-foreground tabular-nums">{formatCurrency(item.unitPrice)}</span>
                                    <span className="text-right font-medium text-foreground tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</span>
                                  </div>
                                ))}
                              </div>
                              {(b.discount > 0 || b.notes) && (
                                <div className="mt-3 space-y-1.5">
                                  {b.discount > 0 && (
                                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                                      <span>Desconto: {b.discount}%</span>
                                      <span className="text-destructive font-medium tabular-nums">
                                        - {formatCurrency(b.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * b.discount / 100)}
                                      </span>
                                    </p>
                                  )}
                                  {b.notes && (
                                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                                      {b.notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : null}

      {/* Project picker modal */}
      <Dialog open={!!projectPickerItem} onOpenChange={(open) => { if (!open) setProjectPickerItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{projectPickerItem?.item ? 'Enviar item ao projeto' : 'Enviar orçamento ao projeto'}</DialogTitle>
          </DialogHeader>
          {availableProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum projeto encontrado para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {availableProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => addItemToProject(p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteConfirmId) { deleteBudget(deleteConfirmId); setDeleteConfirmId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetsPage;
