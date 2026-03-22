import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, Users, Phone, Mail, FileText as DocIcon, ChevronLeft, ChevronDown, ChevronRight, FolderKanban, Clock, Receipt, FileText, SquareKanban, User, ExternalLink, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  responsible: string | null;
  color: string | null;
  created_at: string;
}

const CLIENT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#78716C',
];

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const maskDocument = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

interface ClientDetails {
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; status: string; priority: string; column_id: string | null; project_id: string | null }[];
  timeEntries: { id: string; description: string | null; duration: number | null; project_id: string | null; start_time: string }[];
  invoices: { id: string; total: number; status: string; created_at: string }[];
  budgets: { id: string; total: number; status: string; created_at: string }[];
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const priorityMap: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };
const statusMap: Record<string, string> = { todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluído', review: 'Revisão', blocked: 'Bloqueado' };
const translatePriority = (v: string) => priorityMap[v] || v;
const translateStatus = (v: string) => statusMap[v] || v;

// Shared dialog form component
const ClientFormDialog = ({
  open, onOpenChange, editing, t,
  name, setName, email, setEmail, phone, setPhone,
  document, setDocument, responsible, setResponsible,
  color, setColor, onSave
}: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Client | null; t: any;
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  document: string; setDocument: (v: string) => void;
  responsible: string; setResponsible: (v: string) => void;
  color: string | null; setColor: (v: string | null) => void;
  onSave: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? t.editClient : t.newClient}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nome</label>
          <Input placeholder={t.clientName} value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Responsável</label>
          <Input placeholder="Nome do responsável" value={responsible} onChange={(e) => setResponsible(e.target.value)} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input placeholder="email@exemplo.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Telefone</label>
            <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="rounded-xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Documento (CPF/CNPJ)</label>
          <Input placeholder="000.000.000-00" value={document} onChange={(e) => setDocument(maskDocument(e.target.value))} className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground pb-1 block">Cor do cliente</label>
          <div className="flex items-center gap-2 flex-wrap pb-1">
            {CLIENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? null : c)}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all shrink-0",
                  color === c ? 'border-foreground scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            
            <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />
            
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-7 h-7 rounded-full shrink-0 border-2 transition-all shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:scale-105 overflow-hidden relative",
                    color && !CLIENT_COLORS.includes(color.toUpperCase()) && !CLIENT_COLORS.includes(color)
                      ? 'border-foreground scale-110' 
                      : 'border-transparent'
                  )}
                  style={(color && !CLIENT_COLORS.includes(color.toUpperCase()) && !CLIENT_COLORS.includes(color)) ? { backgroundColor: color } : {}}
                  title="Cor Personalizada"
                >
                  {(!color || CLIENT_COLORS.includes(color) || CLIENT_COLORS.includes(color.toUpperCase())) && (
                    <div className="absolute inset-0 bg-[conic-gradient(from_90deg,red,yellow,lime,aqua,blue,magenta,red)]" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground">Cor Personalizada</span>
                    <div className="flex items-center gap-1.5 bg-muted/60 rounded-md px-1.5 py-1 border border-border/50 focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase select-none">Hex</span>
                      <Input 
                        value={color || ''} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                          setColor(val);
                        }}
                        placeholder="#000000" 
                        className="w-[60px] h-5 text-xs px-0 py-0 font-mono uppercase border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50" 
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="relative w-full rounded-lg overflow-hidden shrink-0 shadow-sm custom-color-picker">
                    <HexColorPicker 
                      color={color || '#000000'} 
                      onChange={setColor}
                      style={{ width: '100%', height: '160px' }}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl font-semibold">
            {t.cancel}
          </Button>
          <Button onClick={onSave} className="flex-1 rounded-xl font-semibold">
            {t.save}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const ClientsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [responsible, setResponsible] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const loadClients = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    if (data) setClients(data);
  }, [user]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const openCreate = () => {
    setEditing(null);
    setName(''); setEmail(''); setPhone(''); setDocument(''); setResponsible(''); setColor(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setDocument(c.document || '');
    setResponsible(c.responsible || '');
    setColor(c.color || null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    if (editing) {
      const updatedData = {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        document: document || null,
        responsible: responsible || null,
        color: color || null,
      };
      const { error } = await supabase.from('clients').update(updatedData as any).eq('id', editing.id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t.save + '!');
        if (selectedClient?.id === editing.id) {
          setSelectedClient(prev => prev ? { ...prev, ...updatedData } : null);
        }
      }
    } else {
      const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        document: document || null,
        responsible: responsible || null,
        color: color || null,
      } as any);
      if (error) toast.error(error.message);
      else toast.success(t.save + '!');
    }
    setDialogOpen(false);
    loadClients();
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) toast.error(error.message);
    else loadClients();
  };

  const loadClientDetails = useCallback(async (clientId: string) => {
    setLoadingDetails(true);
    const [projectsRes, tasksRes, invoicesRes, budgetsRes] = await Promise.all([
      supabase.from('projects').select('id, name').eq('client_id', clientId),
      supabase.from('tasks').select('id, title, status, priority, column_id, project_id').eq('client_id', clientId),
      supabase.from('invoices').select('id, total, status, created_at').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('budgets').select('id, total, status, created_at').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);

    const projectIds = (projectsRes.data || []).map(p => p.id);
    let timeEntries: ClientDetails['timeEntries'] = [];
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('time_entries')
        .select('id, description, duration, project_id, start_time')
        .in('project_id', projectIds)
        .order('start_time', { ascending: false })
        .limit(50);
      timeEntries = data || [];
    }

    setDetails({
      projects: projectsRes.data || [],
      tasks: tasksRes.data || [],
      timeEntries,
      invoices: invoicesRes.data || [],
      budgets: budgetsRes.data || [],
    });
    setLoadingDetails(false);
  }, []);

  const openClient360 = (c: Client) => {
    setSelectedClient(c);
    loadClientDetails(c.id);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  // 360° View
  if (selectedClient) {
    const totalHours = details ? details.timeEntries.reduce((s, e) => s + (e.duration || 0), 0) : 0;
    const totalInvoiced = details ? details.invoices.reduce((s, i) => s + i.total, 0) : 0;
    const totalBudgeted = details ? details.budgets.reduce((s, b) => s + b.total, 0) : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => { setSelectedClient(null); setDetails(null); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Voltar aos clientes
        </button>

        {/* Client header card */}
        <div
          className="p-5 rounded-2xl border overflow-hidden group"
          style={selectedClient.color
            ? { backgroundColor: `${selectedClient.color}08`, borderColor: `${selectedClient.color}30`, borderLeftWidth: '4px', borderLeftColor: selectedClient.color }
            : { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
                style={{ backgroundColor: selectedClient.color || 'hsl(var(--muted-foreground))' }}
              >
                {selectedClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{selectedClient.name}</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {selectedClient.responsible && (
                    <span className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-lg">
                      <User className="w-3 h-3" />{selectedClient.responsible}
                    </span>
                  )}
                  {selectedClient.email && (
                    <a href={`mailto:${selectedClient.email}`} className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                      <Mail className="w-3 h-3" />{selectedClient.email}
                    </a>
                  )}
                  {selectedClient.phone && (
                    <span className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-lg">
                      <Phone className="w-3 h-3" />{maskPhone(selectedClient.phone)}
                    </span>
                  )}
                  {selectedClient.document && (
                    <span className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-lg">
                      <DocIcon className="w-3 h-3" />{maskDocument(selectedClient.document)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold border-border opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(selectedClient)}>
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          </div>
        </div>

        {loadingDetails ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Carregando...</div>
        ) : details && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FolderKanban, value: details.projects.length, label: 'Projetos', route: '/dashboard/projects' },
                { icon: SquareKanban, value: details.tasks.length, label: 'Tarefas', route: '/dashboard/kanban' },
                { icon: Clock, value: formatDuration(totalHours), label: 'Horas', route: '/dashboard/time' },
                { icon: Receipt, value: formatCurrency(totalInvoiced), label: 'Faturado', route: '/dashboard/finance' },
              ].map(({ icon: Icon, value, label, route }) => (
                <div
                  key={label}
                  onClick={() => navigate(route)}
                  className="p-4 rounded-xl border border-border bg-card text-center cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
                </div>
              ))}
            </div>

            {/* Projects with expandable tasks */}
            {details.projects.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" /> Projetos
                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                    {details.projects.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {details.projects.map(p => {
                    const isExpanded = expandedProjects.has(p.id);
                    const projectTasks = details.tasks.filter(t => t.project_id === p.id);
                    const projectTime = details.timeEntries.filter(e => e.project_id === p.id);
                    const totalProjectTime = projectTime.reduce((s, e) => s + (e.duration || 0), 0);
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-xl border border-border overflow-hidden transition-all duration-200",
                          isExpanded ? "shadow-md bg-card" : "bg-card hover:shadow-sm"
                        )}
                      >
                        <div
                          className="flex items-center justify-between p-3.5 text-sm cursor-pointer group"
                          onClick={() => {
                            setExpandedProjects(prev => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                              <span className="font-semibold text-foreground">{p.name}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {projectTasks.length > 0 && (
                                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                                    {projectTasks.length} tarefa{projectTasks.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {totalProjectTime > 0 && (
                                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                                    {formatDuration(totalProjectTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/dashboard/projects'); }}
                            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver
                          </button>
                        </div>
                        {isExpanded && projectTasks.length > 0 && (
                          <div className="border-t border-border/50 animate-fade-in">
                            {projectTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
                                    <SquareKanban className="w-3.5 h-3.5 text-muted-foreground" />
                                  </div>
                                  <button onClick={() => navigate(`/dashboard/kanban?task=${task.id}`)} className="hover:text-primary hover:underline transition-colors font-medium">{task.title}</button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] capitalize">{translatePriority(task.priority)}</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{translateStatus(task.status)}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && projectTasks.length === 0 && (
                          <div className="border-t border-border/50 px-4 py-4 text-xs text-muted-foreground text-center animate-fade-in">
                            Nenhuma tarefa neste projeto.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tasks without project */}
            {(() => {
              const orphanTasks = details.tasks.filter(t => !t.project_id);
              if (orphanTasks.length === 0) return null;
              return (
                <div className="space-y-2.5">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <SquareKanban className="w-3.5 h-3.5" /> Tarefas sem projeto
                    <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                      {orphanTasks.length}
                    </span>
                  </h2>
                  <div className="space-y-1.5">
                    {orphanTasks.slice(0, 10).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card text-sm hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
                            <SquareKanban className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <button onClick={() => navigate(`/dashboard/kanban?task=${task.id}`)} className="font-medium hover:text-primary hover:underline transition-colors">{task.title}</button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{translatePriority(task.priority)}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{translateStatus(task.status)}</Badge>
                        </div>
                      </div>
                    ))}
                    {orphanTasks.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">+{orphanTasks.length - 10} mais</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Time entries */}
            {details.timeEntries.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Registros de Tempo
                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                    {details.timeEntries.length}
                  </span>
                </h2>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {details.timeEntries.slice(0, 10).map((e, idx) => {
                    const proj = details.projects.find(p => p.id === e.project_id);
                    return (
                      <div key={e.id} className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors",
                        idx < Math.min(details.timeEntries.length, 10) - 1 && "border-b border-border/30"
                      )}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-foreground truncate">{e.description || '—'}</span>
                          {proj && (
                            <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md shrink-0">
                              {proj.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground">{new Date(e.start_time).toLocaleDateString()}</span>
                          <span className="font-mono font-semibold text-foreground tabular-nums text-xs bg-muted/60 px-2 py-0.5 rounded-lg">{formatDuration(e.duration || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoices & Budgets */}
            {(details.invoices.length > 0 || details.budgets.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {details.invoices.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" /> Faturas
                      <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                        {details.invoices.length}
                      </span>
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      {details.invoices.map((inv, idx) => (
                        <div key={inv.id} className={cn(
                          "flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors",
                          idx < details.invoices.length - 1 && "border-b border-border/30"
                        )}>
                          <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(inv.total)}</span>
                            <Badge variant="secondary" className="text-[10px] capitalize">{inv.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {details.budgets.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Orçamentos
                      <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                        {details.budgets.length}
                      </span>
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      {details.budgets.map((b, idx) => (
                        <div key={b.id} className={cn(
                          "flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors",
                          idx < details.budgets.length - 1 && "border-b border-border/30"
                        )}>
                          <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(b.total)}</span>
                            <Badge variant="secondary" className="text-[10px] capitalize">{b.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {details.projects.length === 0 && details.tasks.length === 0 && details.invoices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm font-medium">Nenhum dado vinculado a este cliente.</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Crie projetos, tarefas ou faturas para este cliente.</p>
              </div>
            )}
          </>
        )}

        <ClientFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          t={t}
          name={name} setName={setName}
          email={email} setEmail={setEmail}
          phone={phone} setPhone={setPhone}
          document={document} setDocument={setDocument}
          responsible={responsible} setResponsible={setResponsible}
          color={color} setColor={setColor}
          onSave={handleSave}
        />
      </div>
    );
  }

  // Client list view
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.clients}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl font-semibold shadow-sm">
          <Plus className="w-4 h-4" /> {t.newClient}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
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

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">{t.noClients}</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Adicione um cliente para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-sm group"
              )}
              style={c.color
                ? { backgroundColor: `${c.color}08`, borderColor: `${c.color}30`, borderLeftWidth: '3px', borderLeftColor: c.color }
                : { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }
              }
              onClick={() => openClient360(c)}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {c.color && (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!c.color && (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {c.responsible && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.responsible}</span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(c.phone)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-destructive/10" onClick={() => deleteClient(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        t={t}
        name={name} setName={setName}
        email={email} setEmail={setEmail}
        phone={phone} setPhone={setPhone}
        document={document} setDocument={setDocument}
        responsible={responsible} setResponsible={setResponsible}
        color={color} setColor={setColor}
        onSave={handleSave}
      />
    </div>
  );
};

export default ClientsPage;
