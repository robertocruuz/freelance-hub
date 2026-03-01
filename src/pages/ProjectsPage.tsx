import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, Search, DollarSign, User, ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ClientSelect from '@/components/ClientSelect';
import { cn } from '@/lib/utils';

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
      else toast.success(t.save + '!');
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) return toast.error(error.message);
      else toast.success(t.save + '!');
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
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.projects}</h1>
          <p className="text-slate-500 font-medium">Organize and manage your project portfolio.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <Plus className="w-5 h-5" /> {t.newProject}
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
        <input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:shadow-md focus:border-brand-blue/20 outline-none font-semibold transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="clean-card py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderKanban className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-bold text-slate-400 tracking-tight">{t.noProjects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div key={p.id} className="clean-card flex flex-col group hover:border-brand-blue/20 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 flex items-center justify-center text-brand-pink">
                   <FolderKanban className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                   <button
                     onClick={() => handleEdit(p)}
                     className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-brand-blue transition-colors"
                   >
                     <Pencil className="w-4 h-4" />
                   </button>
                   <button
                     onClick={() => handleDelete(p.id)}
                     className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{p.name}</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{clientName(p.client_id)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-brand-darkgreen">
                    <DollarSign className="w-4 h-4" />
                    R$ {p.hourly_rate.toFixed(2)}/h
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex gap-2">
                 <button className="flex-1 btn-outline py-2 text-sm flex items-center justify-center gap-2">
                   Open Board <ExternalLink className="w-3 h-3" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-slate-900">
              {editingId ? t.editProject : t.newProject}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 ml-1">{t.projectName}</label>
               <input
                 placeholder="e.g. Website Redesign"
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
               />
            </div>

            <ClientSelect value={clientId} onChange={setClientId} />

            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 ml-1">{t.hourlyRate}</label>
               <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <input
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
                  />
               </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button onClick={resetForm} className="flex-1 btn-outline">
                {t.cancel}
              </button>
              <button onClick={handleSave} className="flex-1 btn-primary">
                {t.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
