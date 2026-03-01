import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, RefreshCw, Save, Eye, EyeOff, Search, Trash2, Shield, Lock, ShieldCheck, Key, User, Globe, Tag, ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const getStrength = (password: string): { level: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'weak', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: 'medium', color: 'bg-yellow-500' };
  if (score <= 3) return { level: 3, label: 'strong', color: 'bg-brand-blue' };
  return { level: 4, label: 'veryStrong', color: 'bg-brand-darkgreen' };
};

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
    const { error } = await supabase.from('password_vault').delete().eq('id', id);
    if (error) toast.error(error.message);
    else loadVault();
  };

  const strength = password ? getStrength(password) : null;

  const filteredVault = vault.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.passwordGenerator}</h1>
          <p className="text-slate-500 font-medium">Generate strong passwords and store them in your secure vault.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Generator Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="clean-card bg-slate-50/50 p-6 md:p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-slate-700">{t.passwordLength}</span>
                <span className="text-lg font-bold text-brand-blue">{length}</span>
              </div>
              <Slider value={[length]} onValueChange={(v) => setLength(v[0])} min={4} max={64} step={1} className="py-4" />
            </div>

            <div className="space-y-4">
              <span className="text-sm font-bold text-slate-700 block px-1">Preferences</span>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t.uppercase, checked: upper, set: setUpper },
                  { label: t.lowercase, checked: lower, set: setLower },
                  { label: t.numbers, checked: numbers, set: setNumbers },
                  { label: t.symbols, checked: symbols, set: setSymbols },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 cursor-pointer hover:border-brand-blue/20 transition-all shadow-sm">
                    <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} className="w-5 h-5 rounded-md border-slate-200 data-[state=checked]:bg-brand-blue data-[state=checked]:border-brand-blue" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <button disabled={!password} className="w-full btn-primary flex items-center justify-center gap-2 h-14 disabled:opacity-40 shadow-lg shadow-brand-blue/20">
                  <Save className="w-5 h-5" /> {t.saveToVault}
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] p-8 max-w-lg border-none shadow-2xl">
                <DialogHeader><DialogTitle className="text-2xl font-display font-bold text-slate-900">{t.saveToVault}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 ml-1">{t.title}</label>
                     <input placeholder="e.g. Gmail Account" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700 ml-1">{t.category}</label>
                       <input placeholder="Personal" value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700 ml-1">{t.username}</label>
                       <input placeholder="user@gmail.com" value={saveUsername} onChange={(e) => setSaveUsername(e.target.value)} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 ml-1">{t.notes}</label>
                     <textarea placeholder="Extra info..." value={saveNotes} onChange={(e) => setSaveNotes(e.target.value)} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all resize-none" rows={3} />
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 text-white font-display font-bold text-center break-all shadow-inner">
                    {password}
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => setSaveOpen(false)} className="flex-1 btn-outline">{t.cancel}</button>
                    <button onClick={handleSave} className="flex-1 btn-primary">{t.save}</button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-3 space-y-8">
          <div className="clean-card p-8 md:p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-blue/20 transition-all duration-700" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
               <div className="flex-1 w-full text-center md:text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Generated Password</p>
                  <h2 className="text-3xl md:text-5xl font-display font-bold break-all tracking-tight leading-tight">
                    {password || '••••••••'}
                  </h2>
               </div>

               <div className="flex md:flex-col gap-3">
                  <button
                    onClick={generate}
                    className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all shadow-lg active:scale-90"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-6 h-6 text-slate-300" />
                  </button>
                  <button
                    onClick={() => password && copyToClipboard(password)}
                    className="w-14 h-14 rounded-2xl bg-brand-blue hover:bg-brand-blue/90 flex items-center justify-center transition-all shadow-lg active:scale-90"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-6 h-6 text-white" /> : <Copy className="w-6 h-6 text-white" />}
                  </button>
               </div>
            </div>

            {strength && (
              <div className="mt-12 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("w-5 h-5", strength.color.replace('bg-', 'text-'))} />
                    <span className="text-xs font-bold uppercase tracking-wider">{t.strength}: <span className={strength.color.replace('bg-', 'text-')}>{(t as any)[strength.label]}</span></span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-1000", strength.color)}
                    style={{ width: `${(strength.level / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold text-slate-900 px-1">{t.vault}</h2>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.search}
                  className="pl-10 pr-6 py-2.5 rounded-full bg-white border border-slate-100 shadow-sm focus:shadow-md focus:border-brand-blue/20 outline-none font-semibold transition-all text-sm w-full md:w-64"
                />
              </div>
            </div>

            {filteredVault.length === 0 ? (
              <div className="clean-card py-20 text-center bg-slate-50/50 border-dashed">
                <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="font-bold text-slate-400">{t.noPasswords}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVault.map((entry) => (
                  <div key={entry.id} className="clean-card p-5 group hover:border-brand-blue/20 transition-all duration-300">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                           <Globe className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{entry.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.category || 'Personal'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-brand-blue/10 transition-all">
                      <code className="text-sm font-bold text-slate-700 tracking-wider font-mono truncate mr-2">
                        {showVaultPasswords[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••••••'}
                      </code>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                          className="p-2 text-slate-400 hover:text-brand-blue transition-colors"
                        >
                          {showVaultPasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password))}
                          className="p-2 text-slate-400 hover:text-brand-blue transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <User className="w-3 h-3" />
                          {entry.username || 'N/A'}
                       </div>
                       <button className="text-[10px] font-bold text-brand-blue hover:underline flex items-center gap-1">
                          Open <ExternalLink className="w-2.5 h-2.5" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordGeneratorPage;
