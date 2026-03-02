import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Users, Phone, Mail, FileText as DocIcon, Search } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl italic font-display">{t.clients}</h1>
        </div>
        <button onClick={openCreate} className="brutalist-button-primary h-14 uppercase tracking-widest flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> {t.newClient}
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="pl-12 pr-6 brutalist-input h-14 bg-white w-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="brutalist-card bg-white p-20 text-center border-dashed">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20 text-black" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground">{t.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="brutalist-card p-6 bg-white flex items-center justify-between group hover:bg-[#f8f7f9] transition-colors">
              <div className="min-w-0">
                <p className="text-2xl font-bold uppercase italic group-hover:text-primary transition-colors">{c.name}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
                  {c.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{c.phone}</span>}
                  {c.document && <span className="flex items-center gap-1.5"><DocIcon className="w-4 h-4" />{c.document}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(c)} className="w-10 h-10 rounded-xl border-2 border-black bg-white hover:bg-secondary transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => deleteClient(c.id)} className="w-10 h-10 rounded-xl border-2 border-black bg-white hover:bg-destructive hover:text-white transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card p-0 border-none max-w-lg">
          <div className="p-8 bg-primary text-white border-b-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-3xl italic font-display text-white">{editing ? t.editClient : t.newClient}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.clientName}</label>
              <input placeholder={t.clientName} value={name} onChange={(e) => setName(e.target.value)} className="w-full brutalist-input h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1">Email</label>
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full brutalist-input h-12" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.phone}</label>
                <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full brutalist-input h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.document}</label>
                <input placeholder={t.document} value={document} onChange={(e) => setDocument(e.target.value)} className="w-full brutalist-input h-12" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setDialogOpen(false)} className="flex-1 brutalist-button bg-white text-black h-12 uppercase tracking-widest text-xs">{t.cancel}</button>
              <button onClick={handleSave} className="flex-1 brutalist-button-primary h-12 uppercase tracking-widest text-xs">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
