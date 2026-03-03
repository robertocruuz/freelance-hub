import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, Search } from 'lucide-react';
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

  const inputClass = "w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-5xl space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">{t.projects}</h1>
          <p className="text-black/40 font-medium">{projects.length} {t.projects.toLowerCase()} {lang === 'pt-BR' ? 'ativos' : 'active'}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="h-16 px-8 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-6 h-6" /> {t.newProject}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
        <input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-16 pl-16 pr-8 rounded-[1.25rem] bg-white border border-black/5 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-[#1369db]/5 transition-all"
        />
      </div>

      {showForm && (
        <div className="rounded-[2.5rem] border border-black/5 bg-white p-10 space-y-8 shadow-sm">
          <h2 className="text-lg font-bold font-display text-foreground">
            {editingId ? t.editProject : t.newProject}
          </h2>
          <input placeholder={t.projectName} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          <ClientSelect value={clientId} onChange={setClientId} />
          <input
            placeholder={t.hourlyRate}
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={e => setHourlyRate(e.target.value)}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              {t.save}
            </button>
            <button onClick={resetForm} className="px-5 py-2 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-[3rem] py-24 text-center">
          <FolderKanban className="w-16 h-16 mx-auto mb-6 text-black/10" />
          <p className="text-xl font-bold text-black/20 uppercase tracking-widest">{t.noProjects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between p-8 rounded-[2.5rem] border border-black/5 bg-white hover:border-black/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#f8f7f9] flex items-center justify-center text-black/40 group-hover:bg-[#1369db] group-hover:text-white transition-all duration-300">
                  <FolderKanban className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground mb-1">{p.name}</p>
                  <p className="text-sm font-bold text-black/30 uppercase tracking-widest">
                    {clientName(p.client_id)} · R$ {p.hourly_rate.toFixed(2)}/h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleEdit(p)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-black transition-all">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-black/20 hover:text-red-500 transition-all">
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

export default ProjectsPage;
