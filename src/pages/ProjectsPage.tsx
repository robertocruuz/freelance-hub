import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, Search, DollarSign, Briefcase } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#d7ff73] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-4xl italic font-display">{t.projects}</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="brutalist-button-primary h-14 uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> {t.newProject}
          </button>
        )}
      </div>

      {!showForm && (
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="pl-12 pr-6 brutalist-input h-14 bg-white w-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all"
          />
        </div>
      )}

      {showForm && (
        <div className="brutalist-card bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 bg-primary text-white border-b-2 border-black">
            <h2 className="text-2xl font-bold italic font-display">
              {editingId ? t.editProject : t.newProject}
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.projectName}</label>
              <input placeholder={t.projectName} value={name} onChange={e => setName(e.target.value)} className="w-full brutalist-input h-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">CLIENTE</label>
                <div className="[&_button]:brutalist-input [&_button]:h-12 [&_button]:bg-white [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:justify-between">
                  <ClientSelect value={clientId} onChange={setClientId} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.hourlyRate}</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full brutalist-input h-12 pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleSave} className="flex-1 brutalist-button-primary h-12 uppercase tracking-widest text-xs">
                {t.save}
              </button>
              <button onClick={resetForm} className="flex-1 brutalist-button bg-white text-black h-12 uppercase tracking-widest text-xs">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !showForm ? (
        <div className="brutalist-card bg-white p-20 text-center border-dashed">
          <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-20 text-black" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground">{t.noProjects}</p>
        </div>
      ) : (
        !showForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="brutalist-card p-8 bg-white flex flex-col justify-between group hover:bg-[#f8f7f9] transition-colors hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-2xl font-bold uppercase italic group-hover:text-primary transition-colors leading-tight">{p.name}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)} className="w-9 h-9 rounded-lg border-2 border-black bg-white hover:bg-secondary transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="w-9 h-9 rounded-lg border-2 border-black bg-white hover:bg-destructive hover:text-white transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> {clientName(p.client_id)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> R$ {p.hourly_rate.toFixed(2)} / hora
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ProjectsPage;
