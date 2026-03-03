import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Users, Phone, Mail, FileText as DocIcon } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
    <div className="max-w-5xl space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">{t.clients}</h1>
          <p className="text-black/40 font-medium">{clients.length} {t.clients.toLowerCase()} {lang === 'pt-BR' ? 'cadastrados' : 'registered'}</p>
        </div>
        <button
          onClick={openCreate}
          className="h-16 px-8 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-6 h-6" /> {t.newClient}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full h-16 pl-16 pr-8 rounded-[1.25rem] bg-white border border-black/5 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-[#1369db]/5 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-[3rem] py-24 text-center">
          <Users className="w-16 h-16 mx-auto mb-6 text-black/10" />
          <p className="text-xl font-bold text-black/20 uppercase tracking-widest">{t.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-8 rounded-[2.5rem] border border-black/5 bg-white hover:border-black/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#f8f7f9] flex items-center justify-center text-black/40 group-hover:bg-[#1369db] group-hover:text-white transition-all duration-300">
                  <User className="w-8 h-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground mb-1">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-black/30 uppercase tracking-widest">
                    {c.email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{c.phone}</span>}
                    {c.document && <span className="flex items-center gap-2"><DocIcon className="w-4 h-4" />{c.document}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(c)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-black transition-all">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => deleteClient(c.id)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-black/20 hover:text-red-500 transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
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
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder={t.document} value={document} onChange={(e) => setDocument(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
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
