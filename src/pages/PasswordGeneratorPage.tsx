import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, RefreshCw, Save, Eye, EyeOff, Search, Trash2, Key } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface VaultEntry {
  id: string;
  title: string;
  category: string | null;
  username: string | null;
  encrypted_password: string;
  url: string | null;
  notes: string | null;
}

const generatePassword = (length: number, options: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }) => {
  let chars = '';
  if (options.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.numbers) chars += '0123456789';
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getStrength = (password: string): { level: number; label: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'weak' };
  if (score <= 2) return { level: 2, label: 'medium' };
  if (score <= 3) return { level: 3, label: 'strong' };
  return { level: 4, label: 'veryStrong' };
};

const strengthColors = ['', 'bg-destructive', 'bg-yellow-400', 'bg-primary', 'bg-[#d7ff73]'];

// Simple base64 encoding for demo (in production use proper AES encryption via edge function)
const encryptPassword = (pw: string) => btoa(pw);
const decryptPassword = (enc: string) => {
  try { return atob(enc); } catch { return enc; }
};

const PasswordGeneratorPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showVaultPasswords, setShowVaultPasswords] = useState<Record<string, boolean>>({});
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saveUsername, setSaveUsername] = useState('');
  const [saveUrl, setSaveUrl] = useState('');
  const [saveNotes, setSaveNotes] = useState('');

  const loadVault = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('password_vault')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setVault(data);
  }, [user]);

  useEffect(() => { loadVault(); }, [loadVault]);

  const generate = useCallback(() => {
    setPassword(generatePassword(length, { upper, lower, numbers, symbols }));
    setCopied(false);
  }, [length, upper, lower, numbers, symbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    setCopied(false);
  }, [password]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!saveTitle || !password || !user) return;
    const { error } = await supabase.from('password_vault').insert({
      user_id: user.id,
      title: saveTitle,
      category: saveCategory || null,
      username: saveUsername || null,
      encrypted_password: encryptPassword(password),
      url: saveUrl || null,
      notes: saveNotes || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.save + '!');
      setSaveOpen(false);
      setSaveTitle(''); setSaveCategory(''); setSaveUsername(''); setSaveUrl(''); setSaveNotes('');
      loadVault();
    }
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('password_vault').delete().eq('id', id);
    loadVault();
  };

  const strength = password ? getStrength(password) : null;

  const filteredVault = vault.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#d7ff73] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
          <Key className="w-6 h-6 text-black" />
        </div>
        <h1 className="text-4xl italic font-display">{t.passwordGenerator}</h1>
      </div>

      <div className="brutalist-card p-8 space-y-8 bg-white">
        <div className="relative group">
          <div className="flex items-center gap-4 p-6 brutalist-card bg-[#f8f7f9] font-mono text-2xl break-all min-h-[80px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-white transition-colors">
            <span className="flex-1 text-foreground">{password || '...'}</span>
            <div className="flex gap-2">
              <button onClick={generate} className="w-12 h-12 rounded-xl border-2 border-black bg-white hover:bg-[#d7ff73] transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={() => password && copyToClipboard(password)} className="w-12 h-12 rounded-xl border-2 border-black bg-white hover:bg-[#d7ff73] transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {strength && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
              <span>{t.strength}</span>
              <span className="text-primary italic">{(t as any)[strength.label]}</span>
            </div>
            <div className="h-4 rounded-full border-2 border-black bg-muted overflow-hidden flex p-[2px]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex-1 rounded-full transition-all duration-500 border-r border-black last:border-r-0 ${i <= strength.level ? strengthColors[strength.level] : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
              <span>{t.passwordLength}</span>
              <span className="text-xl text-primary">{length}</span>
            </div>
            <Slider value={[length]} onValueChange={(v) => setLength(v[0])} min={4} max={64} step={1} className="py-4" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t.uppercase, checked: upper, set: setUpper },
              { label: t.lowercase, checked: lower, set: setLower },
              { label: t.numbers, checked: numbers, set: setNumbers },
              { label: t.symbols, checked: symbols, set: setSymbols },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-3 p-3 brutalist-card bg-white hover:bg-[#f8f7f9] cursor-pointer transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} className="w-5 h-5 border-2 border-black" />
                <span className="text-xs font-bold uppercase tracking-tight">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <button disabled={!password} className="flex-1 brutalist-button-primary h-14 uppercase tracking-widest disabled:opacity-40">
                <Save className="w-5 h-5 mr-2 inline-block" /> {t.saveToVault}
              </button>
            </DialogTrigger>
            <DialogContent className="brutalist-card p-0 border-none max-w-lg">
              <div className="p-8 bg-primary text-white border-b-2 border-black">
                <DialogHeader><DialogTitle className="text-3xl italic font-display text-white">{t.saveToVault}</DialogTitle></DialogHeader>
              </div>
              <div className="p-8 space-y-5 bg-white">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Título</label>
                  <input placeholder={t.title} value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full brutalist-input h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Categoria</label>
                    <input placeholder={t.category} value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="w-full brutalist-input h-10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Usuário</label>
                    <input placeholder={t.username} value={saveUsername} onChange={(e) => setSaveUsername(e.target.value)} className="w-full brutalist-input h-10" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1">URL</label>
                  <input placeholder={t.url} value={saveUrl} onChange={(e) => setSaveUrl(e.target.value)} className="w-full brutalist-input h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-1">Notas</label>
                  <textarea placeholder={t.notes} value={saveNotes} onChange={(e) => setSaveNotes(e.target.value)} className="w-full brutalist-input min-h-[80px] resize-none py-2" rows={3} />
                </div>

                <div className="p-4 brutalist-card bg-[#f8f7f9] font-mono text-sm border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] break-all">{password}</div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setSaveOpen(false)} className="flex-1 brutalist-button bg-white text-black h-12 uppercase text-xs tracking-widest">{t.cancel}</button>
                  <button onClick={handleSave} className="flex-1 brutalist-button-primary h-12 uppercase text-xs tracking-widest">{t.save}</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vault */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl italic font-display">{t.vault}</h2>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="pl-12 pr-6 brutalist-input h-12 bg-white w-full md:w-80 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
        </div>

        {filteredVault.length === 0 ? (
          <div className="brutalist-card bg-white p-12 text-center border-dashed">
            <p className="text-muted-foreground font-bold uppercase tracking-widest">{t.noPasswords}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVault.map((entry) => (
              <div key={entry.id} className="brutalist-card p-6 bg-white flex flex-col gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="text-xl font-bold uppercase truncate">{entry.title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
                      {entry.category || 'SEM CATEGORIA'} · {entry.username || 'SEM USUÁRIO'}
                    </p>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-destructive hover:text-white transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3 p-4 brutalist-card bg-[#f8f7f9] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="flex-1 font-mono text-base truncate">
                    {showVaultPasswords[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded transition-colors">
                      {showVaultPasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password))} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordGeneratorPage;
