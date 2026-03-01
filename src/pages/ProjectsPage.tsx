import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, Search, DollarSign } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClientSelect from '@/components/ClientSelect';

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  hourly_rate: number;
  created_at: string;
}

const ProjectsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { clients } = useClients();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const resetForm = () => {
    setName('');
    setClientId('');
    setHourlyRate('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const payload = {
      user_id: user.id,
      name: name.trim(),
      client_id: clientId || null,
      hourly_rate: parseFloat(hourlyRate) || 0,
    };

    if (editingId) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) return toast.error(error.message);
    }
    resetForm();
    loadProjects();
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id);
    setName(p.name);
    setClientId(p.client_id || '');
    setHourlyRate(String(p.hourly_rate));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else loadProjects();
  };

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name || '-';

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    clientName(p.client_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            {t.projects}
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">Controle seus jobs e entregas</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="brutalist-button-primary flex items-center gap-3 px-8 py-4 text-lg italic"
          >
            <Plus className="w-6 h-6" /> {t.newProject}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground" />
        <input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full brutalist-input pl-14 h-14 text-lg"
        />
      </div>

      {showForm && (
        <div className="brutalist-card p-8 bg-card border-4 space-y-6 rotate-[-0.5deg]">
          <h2 className="text-3xl font-black font-display text-foreground uppercase italic tracking-tighter border-b-4 border-foreground pb-2">
            {editingId ? t.editProject : t.newProject}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">{t.projectName}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full brutalist-input" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">Cliente</label>
              <ClientSelect value={clientId} onChange={setClientId} />
            </div>
          </div>
          <div className="space-y-1 max-w-xs">
            <label className="text-[10px] font-black uppercase tracking-widest">{t.hourlyRate}</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                className="w-full brutalist-input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={handleSave} className="brutalist-button-primary px-8 py-3 italic">
              {t.save}
            </button>
            <button onClick={resetForm} className="brutalist-button bg-background px-8 py-3 italic">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="brutalist-card p-20 text-center bg-muted/20 border-dashed rotate-[-1deg]">
          <FolderKanban className="w-16 h-16 mx-auto mb-6 opacity-40" />
          <p className="font-black uppercase tracking-widest text-muted-foreground">{t.noProjects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((p, idx) => (
            <div key={p.id} className={`brutalist-card p-0 flex flex-col bg-card overflow-hidden ${idx % 2 === 0 ? 'rotate-1' : 'rotate-[-1]'}`}>
              <div className="h-4 bg-primary border-b-2 border-foreground"></div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-2xl font-black uppercase tracking-tighter italic leading-none">{p.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">
                    {clientName(p.client_id)}
                  </p>
                </div>
                <div className="bg-secondary/20 p-3 border-2 border-foreground rounded font-black italic text-lg text-foreground flex items-center justify-between">
                   <span className="text-xs font-black uppercase not-italic tracking-widest">Taxa/h:</span>
                   <span>R$ {p.hourly_rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => handleEdit(p)} className="w-10 h-10 brutalist-button bg-background flex items-center justify-center p-0">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="w-10 h-10 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
