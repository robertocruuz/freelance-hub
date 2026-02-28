import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, RefreshCw, Save, Eye, EyeOff, Search, Trash2 } from 'lucide-react';
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

const strengthColors = ['', 'bg-destructive', 'bg-yellow-500', 'bg-primary', 'bg-glow-green'];

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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t.passwordGenerator}</h1>

      <div className="brand-card p-8 space-y-8 bg-brand-offwhite">
        <div className="flex items-center gap-4 p-6 border-[3px] border-black rounded-3xl bg-white font-black italic text-2xl break-all min-h-[80px] dark:border-white dark:bg-black">
          <span className="flex-1 text-black dark:text-white">{password || '...'}</span>
          <button onClick={generate} className="text-black hover:text-brand-blue transition-colors dark:text-white">
            <RefreshCw className="w-6 h-6" />
          </button>
          <button onClick={() => password && copyToClipboard(password)} className="text-black hover:text-brand-blue transition-colors dark:text-white">
            {copied ? <Check className="w-6 h-6 text-brand-dark-green" /> : <Copy className="w-6 h-6" />}
          </button>
        </div>

        {strength && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
              <span>{t.strength}</span>
              <span>{(t as any)[strength.label]}</span>
            </div>
            <div className="h-6 rounded-full bg-black/10 border-[3px] border-black overflow-hidden flex dark:bg-white/10 dark:border-white">
              <div
                className={`h-full border-r-[3px] border-black transition-all ${strengthColors[strength.level]}`}
                style={{ width: `${(strength.level / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between text-sm font-black uppercase">
            <span>{t.passwordLength}</span>
            <span className="text-brand-blue">{length}</span>
          </div>
          <Slider value={[length]} onValueChange={(v) => setLength(v[0])} min={4} max={64} step={1} className="py-4" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {[
            { label: t.uppercase, checked: upper, set: setUpper },
            { label: t.lowercase, checked: lower, set: setLower },
            { label: t.numbers, checked: numbers, set: setNumbers },
            { label: t.symbols, checked: symbols, set: setSymbols },
          ].map((opt) => (
            <label key={opt.label} className="flex items-center gap-3 text-sm font-black uppercase cursor-pointer">
              <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} className="w-6 h-6 border-[3px] border-black dark:border-white" />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <button disabled={!password} className="flex-1 btn-brand bg-brand-neon text-xl uppercase font-black italic h-14 disabled:opacity-40">
                <Save className="w-5 h-5 mr-2 inline" /> {t.saveToVault}
              </button>
            </DialogTrigger>
            <DialogContent className="border-[3px] border-black rounded-3xl p-8 dark:border-white max-w-lg">
              <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">{t.saveToVault}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-6">
                <input placeholder={t.title} value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
                <input placeholder={t.category} value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
                <input placeholder={t.username} value={saveUsername} onChange={(e) => setSaveUsername(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white" />
                <textarea placeholder={t.notes} value={saveNotes} onChange={(e) => setSaveNotes(e.target.value)} className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none dark:border-white dark:bg-black dark:text-white resize-none" rows={3} />
                <div className="p-4 rounded-2xl border-[3px] border-black bg-black text-white font-black italic dark:border-white dark:bg-white dark:text-black">{password}</div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setSaveOpen(false)} className="flex-1 btn-brand bg-white text-black uppercase dark:bg-black dark:text-white">{t.cancel}</button>
                  <button onClick={handleSave} className="flex-1 btn-brand bg-brand-blue text-white uppercase">{t.save}</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vault */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">{t.vault}</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50 dark:text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="pl-12 pr-6 py-3 border-[3px] border-black rounded-full bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white"
            />
          </div>
        </div>

        {filteredVault.length === 0 ? (
          <div className="brand-card p-12 text-center">
            <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">{t.noPasswords}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVault.map((entry) => (
              <div key={entry.id} className="brand-card flex flex-col justify-between p-6 bg-white dark:bg-black">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <p className="font-black italic text-xl uppercase tracking-tight truncate">{entry.title}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">{entry.category || 'NO CATEGORY'}</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => deleteEntry(entry.id)} className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-destructive hover:text-white transition-colors dark:border-white">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-[3px] border-black rounded-2xl bg-brand-offwhite dark:bg-black/50 dark:border-white">
                  <span className="font-black italic tracking-widest truncate mr-4">
                    {showVaultPasswords[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="text-black hover:text-brand-blue dark:text-white">
                      {showVaultPasswords[entry.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password))} className="text-black hover:text-brand-blue dark:text-white">
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[10px] font-bold uppercase text-black/60 dark:text-white/60 truncate">{entry.username || 'NO USERNAME'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordGeneratorPage;
