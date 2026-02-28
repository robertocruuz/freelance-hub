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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t.clients}</h1>
        <button onClick={openCreate} className="btn-brand bg-brand-neon flex items-center gap-2 uppercase italic font-black">
          <Plus className="w-5 h-5" /> {t.newClient}
        </button>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full pl-6 pr-6 py-4 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="brand-card py-24 text-center">
          <Users className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">{t.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="brand-card flex flex-col justify-between bg-white dark:bg-black p-6">
              <div className="min-w-0">
                <p className="text-2xl font-black italic uppercase tracking-tight mb-4">{c.name}</p>
                <div className="space-y-2">
                  {c.email && (
                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-brand-blue">
                      <Mail className="w-4 h-4" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-brand-pink">
                      <Phone className="w-4 h-4" /> {c.phone}
                    </div>
                  )}
                  {c.document && (
                    <div className="flex items-center gap-3 text-xs font-bold uppercase text-brand-dark-green">
                      <DocIcon className="w-4 h-4" /> {c.document}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-8 pt-6 border-t-[3px] border-black/10 dark:border-white/10">
                <button onClick={() => openEdit(c)} className="flex-1 btn-brand bg-brand-offwhite text-xs dark:bg-black dark:text-white">EDIT</button>
                <button onClick={() => deleteClient(c.id)} className="w-12 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[3px] border-black rounded-3xl p-8 dark:border-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">{editing ? t.editClient : t.newClient}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <input placeholder={t.clientName} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
            <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
            <input placeholder={t.document} value={document} onChange={(e) => setDocument(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
            <div className="flex gap-4 pt-4">
              <button onClick={() => setDialogOpen(false)} className="flex-1 btn-brand bg-white text-black dark:bg-black dark:text-white">{t.cancel}</button>
              <button onClick={handleSave} className="flex-1 btn-brand bg-brand-blue text-white">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
