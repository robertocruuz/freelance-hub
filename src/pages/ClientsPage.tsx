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
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            {t.clients}
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">Gerencie sua rede de contatos</p>
        </div>
        <button onClick={openCreate} className="brutalist-button-primary flex items-center gap-3 px-8 py-4 text-lg italic">
          <Plus className="w-6 h-6" /> {t.newClient}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full brutalist-input pl-14 h-14 text-lg"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="brutalist-card p-20 text-center bg-muted/20 border-dashed rotate-1">
          <Users className="w-16 h-16 mx-auto mb-6 opacity-40" />
          <p className="font-black uppercase tracking-widest text-muted-foreground">{t.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((c, idx) => (
            <div key={c.id} className={`brutalist-card p-6 flex items-start justify-between bg-card ${idx % 3 === 0 ? 'rotate-[-1deg]' : idx % 3 === 1 ? 'rotate-[1deg]' : 'rotate-0'}`}>
              <div className="min-w-0 space-y-4">
                <p className="text-2xl font-black uppercase tracking-tighter italic border-b-2 border-foreground inline-block pb-1">{c.name}</p>
                <div className="space-y-2">
                  {c.email && (
                    <div className="flex items-center gap-3 bg-secondary/20 p-2 border-2 border-foreground rounded font-bold text-xs uppercase tracking-widest">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-3 bg-accent/20 p-2 border-2 border-foreground rounded font-bold text-xs uppercase tracking-widest">
                      <Phone className="w-4 h-4" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.document && (
                    <div className="flex items-center gap-3 bg-muted/20 p-2 border-2 border-foreground rounded font-bold text-xs uppercase tracking-widest">
                      <DocIcon className="w-4 h-4" />
                      <span>{c.document}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => openEdit(c)} className="w-10 h-10 brutalist-button bg-background flex items-center justify-center p-0">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => deleteClient(c.id)} className="w-10 h-10 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-8 border-foreground p-8 max-w-md rounded-none shadow-brutalist-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter border-b-4 border-foreground pb-4">
              {editing ? t.editClient : t.newClient}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">{t.clientName}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full brutalist-input" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full brutalist-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest">{t.phone}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full brutalist-input" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest">{t.document}</label>
                <input value={document} onChange={(e) => setDocument(e.target.value)} className="w-full brutalist-input" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setDialogOpen(false)} className="flex-1 brutalist-button bg-background">{t.cancel}</button>
              <button onClick={handleSave} className="flex-1 brutalist-button-primary">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
