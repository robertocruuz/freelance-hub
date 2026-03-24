import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, ChevronRight, FolderInput, CalendarIcon, MoreVertical, Search, X } from 'lucide-react';
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
import { useIsDesktop } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  delivery_text: string | null;
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

const getContrastYIQ = (hexcolor: string) => {
  if (!hexcolor) return 'dark';
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? 'dark' : 'light';
};

const BudgetsPage = () => {
  const isDesktop = useIsDesktop();
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
  const [deliveryText, setDeliveryText] = useState('');
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


  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discountValue = subtotal * (discount / 100);
  const total = subtotal - discountValue;



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
          delivery_text: (b as any).delivery_text ?? null,
          discount: (b as any).discount ?? 0,
          notes: (b as any).notes ?? null,
          items: (Array.isArray(b.items) ? b.items : []) as unknown as BudgetItem[],
        };
      }));
    }
  }, [user, clients]);



  useEffect(() => { loadBudgets(); }, [loadBudgets]);

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
      delivery_text: deliveryText || null,
      items: items as unknown as Json,
      total,
      discount,
      notes: notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from('budgets').update(payload).eq('id', editingId);
      if (error) toast.error(error.message);
      else { 
        toast.success(t.save + '!'); 
        
        // Sync the linked project if it exists
        const cName = clients.find(c => c.id === payload.client_id)?.name;
        const projectName = payload.name || cName || 'Projeto do Orçamento';

        let projId = null;
        const { data: projByBudget } = await supabase.from('projects').select('id').eq('budget_id', editingId).maybeSingle();
        if (projByBudget) {
          projId = projByBudget.id;
        } else {
          const query = supabase.from('projects').select('id').eq('name', projectName);
          if (payload.client_id) query.eq('client_id', payload.client_id);
          else query.is('client_id', null);
          const { data: projByName } = await query.maybeSingle();
          if (projByName) projId = projByName.id;
        }

        if (projId) {
          await supabase.from('projects')
            .update({ 
              due_date: payload.delivery_date,
              due_text: payload.delivery_text,
              discount: payload.discount 
            })
            .eq('id', projId);

          // Sincronizar Itens: detectar renomeações antes de deletar
          const { data: oldItems } = await supabase.from('project_items')
            .select('name')
            .eq('project_id', projId)
            .order('position');
          
          if (oldItems && oldItems.length > 0) {
            // Compara itens pela posição com a nova lista e atualiza as Tasks
            for (let i = 0; i < Math.min(oldItems.length, items.length); i++) {
              const oldName = oldItems[i].name;
              const newName = items[i].description;
              
              if (oldName !== newName && oldName.trim() !== '' && newName.trim() !== '') {
                await supabase.from('tasks')
                  .update({ title: newName })
                  .eq('project_id', projId)
                  .eq('title', oldName);
              }
            }
          }

          // Sincronizar itens: deletar antigos e recriar
          await supabase.from('project_items').delete().eq('project_id', projId);
          if (items.length > 0) {
            const inserts = items.map((item, idx) => ({
              project_id: projId,
              name: item.description,
              value: item.quantity * item.unitPrice,
              position: idx,
            }));
            await supabase.from('project_items').insert(inserts);
          }
        }

        resetForm(); 
        loadBudgets(); 
      }
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
    setDeliveryText('');
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
    setDeliveryText(b.delivery_text || '');
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
      deliveryText: b.delivery_text,
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

  const createProjectFromBudget = async (budget: Budget) => {
    if (!user) return;

    const projectName = budget.name || budget.client_name || 'Projeto do Orçamento';

    // Check for duplicate projects with same name for this client
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .eq('client_id', budget.client_id || null)
      .limit(1)
      .maybeSingle();

    if (existingProject) {
      toast.error('Já existe um projeto com este nome para este cliente.');
      return;
    }

    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id,
      name: projectName,
      client_id: budget.client_id || null,
      due_date: budget.delivery_date || null,
      due_text: budget.delivery_text || null,
      discount: budget.discount || 0,
      budget_id: budget.id,
    }).select('id').single();
    if (error) return toast.error(error.message);
    if (data && budget.items.length > 0) {
      const inserts = budget.items.map((item, idx) => ({
        project_id: data.id,
        name: item.description,
        value: item.quantity * item.unitPrice,
        position: idx,
      }));
      const { error: itemsError } = await supabase.from('project_items').insert(inserts);
      if (itemsError) toast.error(itemsError.message);
    }
    toast.success('Projeto criado a partir do orçamento!');
    navigate('/dashboard/projects');
  };

  const isFormOpen = creating || editingId;

  const clientNameFn = (id: string | null) => clients.find(c => c.id === id)?.name || '';
  const clientColorFn = (id: string | null) => (clients.find(c => c.id === id) as any)?.color || null;

  const filteredBudgets = budgets.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchClient = filterClientId === 'all' || b.client_id === filterClientId;
    const matchSearch = !search || 
      (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.client_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchClient && matchSearch;
  });

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">{t.budgets}</h1>
          <p className="text-sm text-muted-foreground">
            {budgets.length} {budgets.length === 1 ? 'orçamento' : 'orçamentos'}
          </p>
        </div>
        {!isFormOpen && (
          <div className="flex items-center gap-2">
            {/* Expandable Search w/ Default Label */}
            <div className="relative group flex items-center h-10">
              <Search className="absolute left-3 w-4 h-4 z-10 pointer-events-none transition-all duration-300 text-muted-foreground group-focus-within:text-primary" />
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "pl-9 pr-8 rounded-full transition-all duration-300 ease-out h-full border bg-background border-border  focus-visible:ring-1 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground text-sm font-medium",
                  search 
                    ? "w-[180px] sm:w-[250px]" 
                    : "w-[130px] sm:w-[140px] cursor-pointer hover:w-[180px] sm:hover:w-[250px] focus:w-[180px] sm:focus:w-[250px] focus:cursor-text"
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <Button
              onClick={() => setCreating(true)}
              className="gap-2 rounded-full font-semibold  shrink-0 h-10 px-4"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t.newBudget}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {!isFormOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', ...statuses].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary '
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {s === 'all' ? 'Todos' : statusLabel(s)}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-[220px]">
            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="h-9 px-3 text-xs rounded-xl font-medium border-border/50 bg-card/60 ">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">Todos os clientes</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
        <div className="max-w-4xl rounded-2xl border border-border bg-card p-6 space-y-5  animate-fade-in mx-auto sm:mx-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <label className="text-xs font-medium text-muted-foreground">Prazo (Data)</label>
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prazo (Texto Livre)</label>
              <Input
                placeholder="Ex: A combinar, 15 dias"
                value={deliveryText}
                onChange={(e) => setDeliveryText(e.target.value)}
                className="rounded-xl h-10 text-sm"
              />
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
            const sortedBudgets = [...filteredBudgets].sort((a, b) => {
              const nameA = a.client_id ? clientNameFn(a.client_id) : 'Z';
              const nameB = b.client_id ? clientNameFn(b.client_id) : 'Z';
              return nameA.localeCompare(nameB);
            });

            
            const renderCard = (b: any) => {
const isExpanded = expandedBudget === b.id;
                  const color = clientColorFn(b.client_id);
                  const contrast = color ? getContrastYIQ(color) : 'dark';
                  const isLight = contrast === 'light';
                  
                  const activeColorStyle = isExpanded && color ? { backgroundColor: color } : {};
                  
                  const tColorNormal = 'text-foreground';
                  const tColorHover = color && !isExpanded ? (isLight ? 'group-hover:text-white' : 'group-hover:text-slate-900') : '';
                  const tColorActive = color && isExpanded ? (isLight ? 'text-white' : 'text-slate-900') : '';
                  const tColor = `${color && isExpanded ? '' : tColorNormal} ${tColorHover} ${tColorActive} transition-colors duration-300`;
                  
                  const mColorNormal = 'text-muted-foreground';
                  const mColorHover = color && !isExpanded ? (isLight ? 'group-hover:text-white/80' : 'group-hover:text-slate-800') : '';
                  const mColorActive = color && isExpanded ? (isLight ? 'text-white/80' : 'text-slate-800') : '';
                  const mColor = `${color && isExpanded ? '' : mColorNormal} ${mColorHover} ${mColorActive} transition-colors duration-300`;
                  
                  const btnColorNormal = 'text-muted-foreground hover:bg-muted hover:text-foreground';
                  const btnColorHover = color && !isExpanded ? (isLight ? 'group-hover:text-white/80 hover:group-hover:bg-white/20 hover:group-hover:text-white' : 'group-hover:text-slate-700 hover:group-hover:bg-slate-900/10 hover:group-hover:text-slate-900') : '';
                  const btnColorActive = color && isExpanded ? (isLight ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'text-slate-700 hover:bg-slate-900/10 hover:text-slate-900') : '';
                  const btnColor = `${color && isExpanded ? '' : btnColorNormal} ${btnColorHover} ${btnColorActive} transition-colors duration-300`;
                  
                  const hlColorNormal = 'bg-muted text-muted-foreground';
                  const hlColorHover = color && !isExpanded ? (isLight ? 'group-hover:bg-white/20 group-hover:text-white' : 'group-hover:bg-slate-900/10 group-hover:text-slate-900') : 'group-hover:bg-primary/10 group-hover:text-primary';
                  const hlColorActive = color && isExpanded ? (isLight ? 'bg-white/20 text-white' : 'bg-slate-900/10 text-slate-900') : 'bg-primary/10 text-primary';
                  const highlightColor = `${isExpanded ? hlColorActive : hlColorNormal} ${!isExpanded ? hlColorHover : ''} transition-colors duration-300`;
                  
                  const stColorHover = color && !isExpanded ? (isLight ? 'group-hover:bg-white/20 group-hover:text-white' : 'group-hover:bg-slate-900/10 group-hover:text-slate-900') : '';
                  const stColorActive = color && isExpanded ? (isLight ? 'bg-white/20 text-white' : 'bg-slate-900/10 text-slate-900') : '';

                  return (
                      <div
                          key={b.id}
                          className={cn(
                            "group rounded-xl border flex flex-col overflow-hidden transition-all duration-300 relative box-border bg-card z-0",
                            isExpanded ? " border-border/80" : " hover:-translate-y-0.5",
                            !color && "hover:border-border/80"
                          )}
                        >
                          {/* Smooth Background Transition */}
                          {color && !isExpanded && (
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out pointer-events-none -z-10"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          
                          {/* Budget header */}
                          <div
                            className={cn(
                              "flex items-center justify-between p-4 cursor-pointer relative z-10",
                              !isExpanded && "transition-colors duration-300",
                              isExpanded && "border-b border-border/50",
                              isExpanded && !color && "bg-muted/20"
                            )}
                            style={activeColorStyle}
                            onClick={() => setExpandedBudget(isExpanded ? null : b.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                highlightColor
                              )}>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("font-semibold truncate", tColor)}>
                                  {b.name || b.client_name || 'Sem nome'}
                                </p>
                                <div className={cn("flex items-center gap-2 mt-0.5 flex-wrap", mColor)}>
                                  {b.client_name && b.name && (
                                    <span className="text-xs">{b.client_name}</span>
                                  )}
                                  {(b.client_name && b.name) && <span className="text-xs">·</span>}
                                  <span className="text-xs flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {b.budget_date ? format(new Date(b.budget_date + 'T12:00:00'), 'dd/MM/yyyy') : new Date(b.created_at).toLocaleDateString()}
                                  </span>
                                  {b.validity_date && (
                                    <>
                                      <span className="text-xs">·</span>
                                      <span className="text-xs">
                                        Val: {format(new Date(b.validity_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <span className={cn("font-semibold tabular-nums text-sm", color ? tColor : "text-primary")}>
                                {formatCurrency(b.total)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80 cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 z-20 relative",
                                    !color ? `focus-visible:ring-ring ${statusColors[b.status]}` : '',
                                    stColorHover,
                                    stColorActive,
                                    color && (isLight ? 'focus-visible:ring-white/50' : 'focus-visible:ring-slate-900/50')
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
                              <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg shrink-0", btnColor)} onClick={() => exportBudgetPdf(b)} title="Exportar PDF">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg shrink-0", btnColor)} onClick={() => createProjectFromBudget(b)} title="Criar projeto a partir do orçamento">
                                <FolderInput className="w-3.5 h-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg shrink-0", btnColor)}>
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEditing(b)}>
                                    <Pencil className="w-4 h-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteConfirmId(b.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && b.items.length > 0 && (
                            <div className="border-t border-border/50 px-4 pb-4 pt-3">
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
                                    <div className="grid grid-cols-[1fr_60px_90px_90px] gap-2 items-center text-xs px-3">
                                      <div className="col-span-2"></div>
                                      <span className="text-right text-muted-foreground tabular-nums">Desconto {b.discount}%</span>
                                      <span className="text-right text-destructive font-medium tabular-nums">
                                        - {formatCurrency(b.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * (b.discount / 100))}
                                      </span>
                                    </div>
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
            };
            
            if (!isDesktop) {
              return (
                <div className="flex flex-col gap-5">
                  {sortedBudgets.map(renderCard)}
                </div>
              );
            }
            
            const col1 = sortedBudgets.filter((_, i) => i % 2 === 0);
            const col2 = sortedBudgets.filter((_, i) => i % 2 === 1);
            
            return (
              <div className="grid grid-cols-2 gap-5 items-start">
                <div className="flex flex-col gap-5">
                  {col1.map(renderCard)}
                </div>
                <div className="flex flex-col gap-5">
                  {col2.map(renderCard)}
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}



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
