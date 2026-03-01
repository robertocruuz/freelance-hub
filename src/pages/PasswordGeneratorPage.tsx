import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, RefreshCw, Save, Eye, EyeOff, Search, Trash2, Key, ShieldCheck } from 'lucide-react';
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

const strengthColors = ['', 'bg-destructive', 'bg-yellow-400', 'bg-primary', 'bg-secondary'];

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
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex items-end gap-4 border-b-8 border-foreground pb-6">
        <Key className="w-12 h-12 mb-1" />
        <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
          {t.passwordGenerator}
        </h1>
      </div>

      <div className="brutalist-card p-8 bg-card rotate-[-0.5deg]">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <div className="flex-1 w-full brutalist-card bg-background p-6 font-mono text-2xl md:text-3xl break-all min-h-[80px] flex items-center justify-center border-4">
            <span className="text-foreground tracking-tight">{password || '...'}</span>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={generate} className="brutalist-button bg-accent p-4 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </button>
            <button onClick={() => password && copyToClipboard(password)} className="brutalist-button-primary p-4 flex-1 md:flex-initial flex items-center justify-center">
              {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-[0.2em]">{t.passwordLength}</span>
                <span className="text-3xl font-black italic">{length}</span>
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
                <button
                  key={opt.label}
                  onClick={() => opt.set(!opt.checked)}
                  className={`flex items-center gap-3 p-3 border-2 border-foreground rounded-xl transition-all font-bold uppercase text-[10px] tracking-widest ${opt.checked ? 'bg-secondary' : 'bg-background opacity-50'}`}
                >
                  <div className={`w-5 h-5 border-2 border-foreground flex items-center justify-center rounded ${opt.checked ? 'bg-foreground' : 'bg-transparent'}`}>
                    {opt.checked && <Check className="w-3 h-3 text-secondary" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8 flex flex-col justify-between">
            {strength && (
              <div className="brutalist-card p-6 bg-secondary/10 border-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{t.strength}</span>
                  </div>
                  <span className="text-sm font-black uppercase italic">{(t as any)[strength.label]}</span>
                </div>
                <div className="h-4 border-2 border-foreground rounded-full bg-muted overflow-hidden flex p-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex-1 rounded-full border border-foreground/20 transition-all ${i <= strength.level ? strengthColors[strength.level] : 'bg-transparent'}`} />
                  ))}
                </div>
              </div>
            )}

            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <button disabled={!password} className="w-full py-5 brutalist-button-primary text-xl uppercase font-black italic flex items-center justify-center gap-3 disabled:opacity-40">
                  <Save className="w-6 h-6" /> {t.saveToVault}
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-8 border-foreground p-8 max-w-md rounded-none shadow-brutalist-lg">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter border-b-4 border-foreground pb-4">{t.saveToVault}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest">{t.title}</label>
                    <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full brutalist-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest">{t.category}</label>
                      <input value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="w-full brutalist-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest">{t.username}</label>
                      <input value={saveUsername} onChange={(e) => setSaveUsername(e.target.value)} className="w-full brutalist-input" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest">{t.url}</label>
                    <input value={saveUrl} onChange={(e) => setSaveUrl(e.target.value)} className="w-full brutalist-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest">{t.notes}</label>
                    <textarea value={saveNotes} onChange={(e) => setSaveNotes(e.target.value)} className="w-full brutalist-input resize-none" rows={3} />
                  </div>
                  <div className="p-4 bg-secondary/20 border-2 border-foreground font-mono text-xs break-all uppercase font-bold">{password}</div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setSaveOpen(false)} className="flex-1 brutalist-button bg-background">{t.cancel}</button>
                    <button onClick={handleSave} className="flex-1 brutalist-button-primary">{t.save}</button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Vault */}
      <div className="space-y-8 rotate-[0.5deg]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-foreground pb-4">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">{t.vault}</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="w-full brutalist-input pl-12 h-12" />
          </div>
        </div>

        {filteredVault.length === 0 ? (
          <div className="brutalist-card p-12 text-center bg-muted/20 border-dashed">
            <p className="font-black uppercase tracking-widest text-muted-foreground">{t.noPasswords}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVault.map((entry) => (
              <div key={entry.id} className="brutalist-card p-6 flex flex-col justify-between group hover:bg-secondary/5 transition-colors">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xl font-black uppercase tracking-tight italic truncate">{entry.title}</p>
                    <span className="px-2 py-0.5 bg-accent text-[9px] font-black uppercase tracking-widest border border-foreground rounded">
                      {entry.category || 'Geral'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{entry.username || 'Sem usuário'}</p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background border-2 border-foreground rounded-lg font-mono text-sm overflow-hidden">
                  <span className="flex-1 truncate tracking-wider">
                    {showVaultPasswords[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••••••'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="p-1.5 hover:bg-secondary rounded transition-colors">
                      {showVaultPasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password))} className="p-1.5 hover:bg-primary hover:text-primary-foreground rounded transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
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
