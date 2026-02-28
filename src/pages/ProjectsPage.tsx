import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderKanban } from 'lucide-react';
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

  const inputClass = "w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white";

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t.projects}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-brand bg-brand-neon flex items-center gap-2 uppercase italic font-black"
        >
          <Plus className="w-5 h-5" /> {t.newProject}
        </button>
      </div>

      <div className="relative">
        <input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass + " max-w-md"}
        />
      </div>

      {showForm && (
        <div className="brand-card p-8 space-y-6 bg-brand-offwhite">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">
            {editingId ? t.editProject : t.newProject}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={handleSave} className="flex-1 btn-brand bg-brand-blue text-white uppercase font-black italic h-12">
              {t.save}
            </button>
            <button onClick={resetForm} className="flex-1 btn-brand bg-white text-black uppercase font-black italic h-12 dark:bg-black dark:text-white">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="brand-card py-24 text-center">
          <FolderKanban className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">{t.noProjects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(p => (
            <div key={p.id} className="brand-card flex flex-col justify-between bg-white dark:bg-black p-6">
              <div className="min-w-0">
                <p className="text-2xl font-black italic uppercase tracking-tight mb-4">{p.name}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-pink mb-1">
                  CLIENT: {clientName(p.client_id)}
                </p>
                <p className="text-xs font-black uppercase text-brand-dark-green">
                   RATE: R$ {p.hourly_rate.toFixed(2)}/h
                </p>
              </div>
              <div className="flex items-center gap-4 mt-8 pt-6 border-t-[3px] border-black/10 dark:border-white/10">
                <button onClick={() => handleEdit(p)} className="flex-1 btn-brand bg-brand-offwhite text-xs dark:bg-black dark:text-white">EDIT</button>
                <button onClick={() => handleDelete(p.id)} className="w-12 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black">
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
