import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Users, Phone, Mail, FileText as DocIcon, Search, MoreVertical } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  created_at: string;
}

const ClientsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');

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
    setName(''); setEmail(''); setPhone(''); setDocument('');
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setDocument(c.document || '');
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

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.clients}</h1>
          <p className="text-slate-500 font-medium">Manage your client relationships and contact details.</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <Plus className="w-5 h-5" /> {t.newClient}
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:shadow-md focus:border-brand-blue/20 outline-none font-semibold transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="clean-card py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-bold text-slate-400 tracking-tight">{t.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="clean-card flex flex-col group hover:border-brand-blue/20 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-xl">
                  {c.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                   <button
                     onClick={() => openEdit(c)}
                     className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-brand-blue transition-colors"
                   >
                     <Pencil className="w-4 h-4" />
                   </button>
                   <button
                     onClick={() => deleteClient(c.id)}
                     className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{c.name}</h3>

                <div className="space-y-2">
                  {c.email && (
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                      <Mail className="w-4 h-4 text-slate-400" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                      <Phone className="w-4 h-4 text-slate-400" /> {c.phone}
                    </div>
                  )}
                  {c.document && (
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                      <DocIcon className="w-4 h-4 text-slate-400" /> {c.document}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex gap-2">
                 <button className="flex-1 btn-outline py-2 text-sm">View Projects</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-slate-900">
              {editing ? t.editClient : t.newClient}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 ml-1">{t.clientName}</label>
               <input
                 placeholder="e.g. Acme Corp"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                 <input
                   placeholder="client@email.com"
                   type="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 ml-1">{t.phone}</label>
                 <input
                   placeholder="+1 (555) 000-0000"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                   className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
                 />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 ml-1">{t.document}</label>
               <input
                 placeholder="ID or Tax Number"
                 value={document}
                 onChange={(e) => setDocument(e.target.value)}
                 className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
               />
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 btn-outline"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn-primary"
              >
                {t.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
