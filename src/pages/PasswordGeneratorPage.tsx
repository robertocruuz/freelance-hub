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
    <div className="max-w-4xl space-y-12 animate-fade-in">
      <h1 className="text-4xl font-bold text-foreground tracking-tight">{t.passwordGenerator}</h1>

      <div className="bg-white border border-black/5 rounded-[2.5rem] p-10 space-y-10 shadow-sm">
        <div className="flex items-center gap-4 p-6 rounded-3xl bg-[#f8f7f9] font-mono text-2xl break-all min-h-[80px] border border-black/5">
          <span className="flex-1 text-foreground tracking-wider">{password || '...'}</span>
          <div className="flex gap-2">
            <button onClick={generate} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors text-black/40 hover:text-black">
              <RefreshCw className="w-6 h-6" />
            </button>
            <button onClick={() => password && copyToClipboard(password)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors text-black/40 hover:text-black">
              {copied ? <Check className="w-6 h-6 text-[#3b9166]" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {strength && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold uppercase tracking-widest text-black/30">
              <span>{t.strength}</span>
              <span className="text-black/60">{(t as any)[strength.label]}</span>
            </div>
            <div className="h-3 rounded-full bg-[#f8f7f9] overflow-hidden flex gap-1.5 p-0.5 border border-black/5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${i <= strength.level ? strengthColors[strength.level] : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold uppercase tracking-widest text-black/30">{t.passwordLength}</span>
            <span className="text-3xl font-black text-[#1369db]">{length}</span>
          </div>
          <Slider value={[length]} onValueChange={(v) => setLength(v[0])} min={4} max={64} step={1} className="py-4" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: t.uppercase, checked: upper, set: setUpper },
            { label: t.lowercase, checked: lower, set: setLower },
            { label: t.numbers, checked: numbers, set: setNumbers },
            { label: t.symbols, checked: symbols, set: setSymbols },
          ].map((opt) => (
            <label key={opt.label} className="flex items-center gap-3 text-sm font-bold text-black/60 cursor-pointer hover:text-black transition-colors">
              <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} className="w-5 h-5 rounded-md border-black/10 data-[state=checked]:bg-[#1369db] data-[state=checked]:border-[#1369db]" />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <button disabled={!password} className="flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-20 shadow-lg shadow-blue-500/20">
                <Save className="w-5 h-5" /> {t.saveToVault}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.saveToVault}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <input placeholder={t.title} value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input placeholder={t.category} value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input placeholder={t.username} value={saveUsername} onChange={(e) => setSaveUsername(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input placeholder={t.url} value={saveUrl} onChange={(e) => setSaveUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea placeholder={t.notes} value={saveNotes} onChange={(e) => setSaveNotes(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} />
                <div className="p-3 rounded-lg bg-muted font-mono text-sm text-foreground break-all">{password}</div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSaveOpen(false)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
                  <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vault */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">{t.vault}</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="pl-11 pr-6 h-12 rounded-xl bg-white border border-black/5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1369db]/20 transition-all w-64"
            />
          </div>
        </div>

        {filteredVault.length === 0 ? (
          <div className="bg-white border border-black/5 rounded-[2rem] p-12 text-center">
            <p className="text-black/30 font-bold uppercase tracking-widest text-sm">{t.noPasswords}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredVault.map((entry) => (
              <div key={entry.id} className="flex items-center gap-6 p-6 rounded-[1.5rem] bg-white border border-black/5 hover:border-black/10 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-[#1369db]/5 flex items-center justify-center text-[#1369db]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-foreground truncate">{entry.title}</p>
                  <p className="text-sm font-medium text-black/30">{entry.category || 'No Category'} · {entry.username || 'No Username'}</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-base text-black/60 bg-[#f8f7f9] px-4 py-2 rounded-xl border border-black/5">
                  <span className="min-w-[100px] text-center tracking-wider">
                    {showVaultPasswords[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••'}
                  </span>
                  <div className="flex items-center gap-1 border-l border-black/10 pl-2 ml-1">
                    <button onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
                      {showVaultPasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password))} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
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
