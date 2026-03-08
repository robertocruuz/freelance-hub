import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Pencil, Users, Phone, Mail, FileText as DocIcon, ChevronLeft, ChevronDown, ChevronRight, FolderKanban, Clock, Receipt, FileText, SquareKanban, User, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
    // CPF: 000.000.000-00
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  // CNPJ: 00.000.000/0000-00
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
  // 360° view
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
    setName(''); setEmail(''); setPhone(''); setDocument(''); setResponsible('');
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setDocument(c.document || '');
    setResponsible(c.responsible || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    if (editing) {
      const { error } = await supabase.from('clients').update({
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        document: document || null,
        responsible: responsible || null,
      }).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success(t.save + '!');
    } else {
      const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        document: document || null,
        responsible: responsible || null,
      });
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

  // Load 360° details
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
        <button onClick={() => { setSelectedClient(null); setDetails(null); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar aos clientes
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedClient.name}</h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              {selectedClient.email && <a href={`mailto:${selectedClient.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors"><Mail className="w-3 h-3" />{selectedClient.email}</a>}
              {selectedClient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(selectedClient.phone)}</span>}
              {selectedClient.document && <span className="flex items-center gap-1"><DocIcon className="w-3 h-3" />{maskDocument(selectedClient.document)}</span>}
            </div>
          </div>
          <button onClick={() => openEdit(selectedClient)} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">
            <Pencil className="w-3.5 h-3.5 inline mr-1" /> Editar
          </button>
        </div>

        {loadingDetails ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Carregando...</div>
        ) : details && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div onClick={() => navigate('/dashboard/projects')} className="p-4 rounded-2xl glass text-center cursor-pointer hover:border-primary/40 transition-colors border border-transparent">
                <FolderKanban className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{details.projects.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projetos</p>
              </div>
              <div onClick={() => navigate('/dashboard/kanban')} className="p-4 rounded-2xl glass text-center cursor-pointer hover:border-primary/40 transition-colors border border-transparent">
                <SquareKanban className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{details.tasks.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tarefas</p>
              </div>
              <div onClick={() => navigate('/dashboard/time')} className="p-4 rounded-2xl glass text-center cursor-pointer hover:border-primary/40 transition-colors border border-transparent">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{formatDuration(totalHours)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Horas</p>
              </div>
              <div onClick={() => navigate('/dashboard/invoices')} className="p-4 rounded-2xl glass text-center cursor-pointer hover:border-primary/40 transition-colors border border-transparent">
                <Receipt className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">R$ {totalInvoiced.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faturado</p>
              </div>
            </div>

            {/* Projects with expandable tasks */}
            {details.projects.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4" /> Projetos
                </h2>
                <div className="space-y-1.5">
                  {details.projects.map(p => {
                    const isExpanded = expandedProjects.has(p.id);
                    const projectTasks = details.tasks.filter(t => t.project_id === p.id);
                    return (
                      <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setExpandedProjects(prev => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="font-medium">{p.name}</span>
                            {projectTasks.length > 0 && (
                              <Badge variant="secondary" className="text-[10px]">{projectTasks.length} tarefa{projectTasks.length !== 1 ? 's' : ''}</Badge>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/dashboard/projects'); }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver projeto
                          </button>
                        </div>
                        {isExpanded && projectTasks.length > 0 && (
                          <div className="border-t border-border bg-muted/30">
                            {projectTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-border/50 last:border-b-0">
                                <div className="flex items-center gap-2">
                                  <SquareKanban className="w-3 h-3 text-muted-foreground" />
                                  <button onClick={() => navigate(`/dashboard/kanban?task=${task.id}`)} className="hover:text-primary hover:underline transition-colors">{task.title}</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] capitalize">{translatePriority(task.priority)}</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{translateStatus(task.status)}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && projectTasks.length === 0 && (
                          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
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
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <SquareKanban className="w-4 h-4" /> Tarefas sem projeto
                  </h2>
                  <div className="space-y-1.5">
                    {orphanTasks.slice(0, 10).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
                        <button onClick={() => navigate(`/dashboard/kanban?task=${task.id}`)} className="font-medium hover:text-primary hover:underline transition-colors">{task.title}</button>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{translatePriority(task.priority)}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{translateStatus(task.status)}</Badge>
                        </div>
                      </div>
                    ))}
                    {orphanTasks.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">+{orphanTasks.length - 10} mais</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Time entries */}
            {details.timeEntries.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Registros de Tempo
                </h2>
                <div className="space-y-1.5">
                  {details.timeEntries.slice(0, 10).map(e => {
                    const proj = details.projects.find(p => p.id === e.project_id);
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
                        <div>
                          <span className="font-medium">{e.description || '—'}</span>
                          {proj && <span className="text-xs text-muted-foreground ml-2">({proj.name})</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{new Date(e.start_time).toLocaleDateString()}</span>
                          <span className="font-mono font-semibold">{formatDuration(e.duration || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoices & Budgets */}
            {(details.invoices.length > 0 || details.budgets.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.invoices.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" /> Faturas
                    </h2>
                    <div className="space-y-1.5">
                      {details.invoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
                          <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(inv.total)}</span>
                            <Badge variant="secondary" className="text-[10px] capitalize">{inv.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {details.budgets.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Orçamentos
                    </h2>
                    <div className="space-y-1.5">
                      {details.budgets.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
                          <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(b.total)}</span>
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
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum dado vinculado a este cliente ainda.</p>
              </div>
            )}
          </>
        )}

        {/* Edit dialog (reused) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t.editClient : t.newClient}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <input placeholder={t.clientName} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input placeholder="Responsável" value={responsible} onChange={(e) => setResponsible(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input placeholder={t.document} value={document} onChange={(e) => setDocument(maskDocument(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDialogOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Client list view
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.clients}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> {t.newClient}
        </button>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t.noClients}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openClient360(c)}>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{c.name}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(c.phone)}</span>}
                  {c.document && <span className="flex items-center gap-1"><DocIcon className="w-3 h-3" />{maskDocument(c.document)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.editClient : t.newClient}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input placeholder={t.clientName} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Responsável" value={responsible} onChange={(e) => setResponsible(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder={t.document} value={document} onChange={(e) => setDocument(maskDocument(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDialogOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
