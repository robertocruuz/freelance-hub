import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Download, Pencil, ChevronDown, ChevronRight, FolderKanban, CalendarIcon } from 'lucide-react';
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
  const [projectPickerItem, setProjectPickerItem] = useState<{ item: BudgetItem; budget: Budget } | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [importedItemKeys, setImportedItemKeys] = useState<Set<string>>(new Set());

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

  const exportBudgetPdf = (b: Budget) => {
    generateDocumentPdf({
      title: t.budgets,
      type: 'budget',
      items: b.items,
      total: b.total,
      status: statusLabel(b.status),
      createdAt: b.created_at,
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

  const openProjectPicker = async (item: BudgetItem, budget: Budget) => {
    setProjectPickerItem({ item, budget });
    const query = supabase.from('projects').select('id, name, client_id').order('name');
    if (budget.client_id) query.eq('client_id', budget.client_id);
    const { data } = await query;
    setAvailableProjects((data || []) as ProjectOption[]);
  };

  const addItemToProject = async (projectId: string) => {
    if (!projectPickerItem) return;
    const { item } = projectPickerItem;
    const { error } = await supabase.from('project_items').insert({
      project_id: projectId,
      name: item.description,
      value: item.quantity * item.unitPrice,
      position: 0,
    });
    if (error) return toast.error(error.message);
    toast.success(`"${item.description}" adicionado ao projeto!`);
    setProjectPickerItem(null);
    loadImportedItems();
  };

  const isFormOpen = creating || editingId;

  const inputClass = "px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.budgets}</h1>
        {!isFormOpen && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> {t.newBudget}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {/* Budget name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome do Orçamento</label>
            <input
              placeholder="Ex: Projeto Website Corporativo"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Client select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Cliente</label>
            <ClientSelect value={clientId} onChange={setClientId} placeholder={t.client} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !budgetDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {budgetDate ? format(budgetDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={budgetDate} onSelect={setBudgetDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Validade</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !validityDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validityDate ? format(validityDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={validityDate} onSelect={setValidityDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Prazo de Entrega</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Add items section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Adicionar Itens</h3>
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
                placeholder="Valor"
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
                Adicionar
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
                    <th className="text-right py-3 px-3 font-semibold text-foreground w-32">Valor Unit.</th>
                    <th className="text-right py-3 px-3 font-semibold text-foreground w-32">Total</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground w-32">Ações</th>
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
                              <button onClick={saveEditItem} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Salvar</button>
                              <button onClick={cancelEditItem} className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90">Cancelar</button>
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
                              <button onClick={() => startEditItem(idx)} className="px-3 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold hover:opacity-90">Editar</button>
                              <button onClick={() => removeItem(idx)} className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90">Excluir</button>
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
              <label className="text-sm font-medium text-foreground">Desconto (%)</label>
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
            <label className="text-sm font-medium text-foreground">Observação</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre o orçamento..."
              className={`${inputClass} w-full resize-y`}
            />
          </div>

          {/* Summary & actions */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({discount}%)</span>
                <span className="text-destructive">- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm">{t.cancel}</button>
              <button onClick={saveBudget} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && !isFormOpen ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum orçamento criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {budgets.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => setExpandedBudget(expandedBudget === b.id ? null : b.id)} className="flex items-center gap-2 text-left">
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedBudget === b.id ? 'rotate-90' : ''}`} />
                  <div>
                    <p className="font-semibold text-foreground">{b.name || b.client_name || 'Sem nome'} · {b.items.length} itens</p>
                    <p className="text-xs text-muted-foreground">
                      {b.client_name && b.name ? `${b.client_name} · ` : ''}
                      {b.budget_date ? format(new Date(b.budget_date + 'T12:00:00'), 'dd/MM/yyyy') : new Date(b.created_at).toLocaleDateString()}
                      {b.validity_date && ` · Validade: ${format(new Date(b.validity_date + 'T12:00:00'), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">R$ {b.total.toFixed(2)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <Badge className={`${statusColors[b.status]} cursor-pointer flex items-center gap-1`}>
                          {statusLabel(b.status)}
                          <ChevronDown className="w-3 h-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {statuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => changeStatus(b.id, s)}
                          className={b.status === s ? 'font-bold' : ''}
                        >
                          {statusLabel(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={() => startEditing(b)} className="text-muted-foreground hover:text-primary" title="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => exportBudgetPdf(b)} className="text-muted-foreground hover:text-primary" title="Exportar PDF"><Download className="w-4 h-4" /></button>
                  <button onClick={() => deleteBudget(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expandedBudget === b.id && b.items.length > 0 && (
                <div className="border-t border-border px-4 pb-3 pt-2 space-y-1">
                  <div className="grid grid-cols-[1fr_80px_100px_100px] gap-2 text-xs font-medium text-muted-foreground px-1 pb-1">
                    <span>{t.description}</span>
                    <span className="text-center">{t.quantity}</span>
                    <span className="text-right">{t.unitPrice}</span>
                    <span className="text-right">Subtotal</span>
                    <span></span>
                  </div>
                  {b.items.map((item, idx) => {
                    const isImported = importedItemKeys.has(makeItemKey(item.description, item.quantity * item.unitPrice));
                    return (
                    <div key={idx} className={`grid grid-cols-[1fr_80px_100px_100px_auto] gap-2 items-center text-sm px-1 py-1.5 rounded-lg hover:bg-muted/50 ${isImported ? 'opacity-60' : ''}`}>
                      <span className="text-foreground truncate flex items-center gap-1.5">
                        {item.description || '—'}
                        {isImported && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">No projeto</Badge>}
                      </span>
                      <span className="text-center text-muted-foreground">{item.quantity}</span>
                      <span className="text-right text-muted-foreground">R$ {item.unitPrice.toFixed(2)}</span>
                      <span className="text-right font-medium text-foreground">R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                      <div className="flex items-center gap-2">
                        {isImported ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <FolderKanban className="w-3.5 h-3.5" />
                            Importado
                          </span>
                        ) : (
                          <button
                            onClick={() => openProjectPicker(item, b)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                            title="Adicionar ao projeto"
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                            Projeto
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {/* Show discount & notes in expanded view */}
                  {(b.discount > 0 || b.notes) && (
                    <div className="border-t border-border/50 mt-2 pt-2 space-y-1">
                      {b.discount > 0 && (
                        <p className="text-xs text-muted-foreground">Desconto: {b.discount}% (- R$ {(b.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * b.discount / 100).toFixed(2)})</p>
                      )}
                      {b.notes && (
                        <p className="text-xs text-muted-foreground">Obs: {b.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Project picker modal */}
      <Dialog open={!!projectPickerItem} onOpenChange={(open) => { if (!open) setProjectPickerItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Selecionar projeto</DialogTitle>
          </DialogHeader>
          {availableProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum projeto encontrado para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {availableProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => addItemToProject(p.id)}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-accent text-left transition-colors"
                >
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetsPage;
