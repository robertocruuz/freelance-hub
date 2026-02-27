import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, Save, Eye, EyeOff, Search, Trash2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface VaultEntry {
  id: string;
  title: string;
  category: string;
  username: string;
  password: string;
  url: string;
  notes: string;
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

const PasswordGeneratorPage = () => {
  const { t } = useI18n();
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

  // Save dialog state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saveUsername, setSaveUsername] = useState('');
  const [saveUrl, setSaveUrl] = useState('');
  const [saveNotes, setSaveNotes] = useState('');

  const generate = useCallback(() => {
    setPassword(generatePassword(length, { upper, lower, numbers, symbols }));
    setCopied(false);
  }, [length, upper, lower, numbers, symbols]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!saveTitle || !password) return;
    const entry: VaultEntry = {
      id: Date.now().toString(),
      title: saveTitle,
      category: saveCategory,
      username: saveUsername,
      password: password,
      url: saveUrl,
      notes: saveNotes,
    };
    setVault((prev) => [entry, ...prev]);
    setSaveOpen(false);
    setSaveTitle('');
    setSaveCategory('');
    setSaveUsername('');
    setSaveUrl('');
    setSaveNotes('');
  };

  const strength = password ? getStrength(password) : null;

  const filteredVault = vault.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold font-display">{t.passwordGenerator}</h1>

      {/* Generator card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
        {/* Password display */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted font-mono text-lg break-all min-h-[56px]">
          <span className="flex-1 text-foreground">{password || '...'}</span>
          <button onClick={() => password && copyToClipboard(password)} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Strength bar */}
        {strength && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.strength}</span>
              <span>{(t as any)[strength.label]}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i <= strength.level ? strengthColors[strength.level] : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Length slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.passwordLength}</span>
            <span className="font-semibold text-foreground">{length}</span>
          </div>
          <Slider value={[length]} onValueChange={(v) => setLength(v[0])} min={4} max={64} step={1} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t.uppercase, checked: upper, set: setUpper },
            { label: t.lowercase, checked: lower, set: setLower },
            { label: t.numbers, checked: numbers, set: setNumbers },
            { label: t.symbols, checked: symbols, set: setSymbols },
          ].map((opt) => (
            <label key={opt.label} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={generate} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> {t.generate}
          </button>
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <button
                disabled={!password}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Save className="w-4 h-4" /> {t.saveToVault}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.saveToVault}</DialogTitle>
              </DialogHeader>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-display">{t.vault}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {filteredVault.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">{t.noPasswords}</p>
        ) : (
          <div className="space-y-2">
            {filteredVault.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">{entry.category} · {entry.username}</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                  <span className="max-w-[120px] truncate">
                    {showVaultPasswords[entry.id] ? entry.password : '••••••••'}
                  </span>
                  <button onClick={() => setShowVaultPasswords((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="text-muted-foreground hover:text-foreground">
                    {showVaultPasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyToClipboard(entry.password)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => setVault((prev) => prev.filter((e) => e.id !== entry.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
