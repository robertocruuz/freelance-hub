import { useI18n } from '@/hooks/useI18n';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTheme } from '@/hooks/useTheme';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Monitor, Globe, Bell, Database, Download, Trash2, Palette, Languages, BellRing, CalendarClock, UserPlus, ArrowDownToLine, HardDriveDownload, Sparkles, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SettingsPage = () => {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, isDark } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPt = lang === 'pt-BR';

  const [notifications, setNotifications] = useState({
    email: true,
    tasks: true,
    invites: true,
  });

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportData = async () => {
    if (!user) return;
    setExportLoading(true);
    try {
      const tables = ['clients', 'projects', 'budgets', 'invoices', 'tasks', 'time_entries'] as const;
      const data: Record<string, any[]> = {};

      for (const table of tables) {
        const { data: rows } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id);
        data[table] = rows || [];
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: isPt ? 'Dados exportados com sucesso!' : 'Data exported successfully!' });
    } catch {
      toast({ title: isPt ? 'Erro ao exportar dados' : 'Error exporting data', variant: 'destructive' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast({ title: isPt ? 'Cache limpo! Recarregando...' : 'Cache cleared! Reloading...' });
    setTimeout(() => window.location.reload(), 1000);
  };

  const themeOptions = [
    { value: 'light', label: isPt ? 'Claro' : 'Light', icon: Sun, preview: 'bg-background border-border' },
    { value: 'dark', label: isPt ? 'Escuro' : 'Dark', icon: Moon, preview: 'bg-foreground border-foreground' },
    { value: 'system', label: isPt ? 'Sistema' : 'System', icon: Monitor, preview: 'bg-gradient-to-br from-background to-foreground border-border' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.settings}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt ? 'Personalize sua experiência' : 'Customize your experience'}
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Aparência ── */}
        <SettingsCard
          icon={Palette}
          title={isPt ? 'Aparência' : 'Appearance'}
          description={isPt ? 'Escolha como o Freelaz se parece' : 'Choose how Freelaz looks'}
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${isSelected
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <opt.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : ''}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* ── Idioma ── */}
        <SettingsCard
          icon={Languages}
          title={isPt ? 'Idioma' : 'Language'}
          description={isPt ? 'Defina o idioma da interface' : 'Set the interface language'}
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
            {[
              { value: 'pt-BR', flag: '🇧🇷', label: 'Português' },
              { value: 'en', flag: '🇺🇸', label: 'English' },
            ].map((opt) => {
              const isSelected = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${isSelected
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span className="text-base">{opt.flag}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* ── Notificações ── */}
        <SettingsCard
          icon={Bell}
          title={isPt ? 'Notificações' : 'Notifications'}
          description={isPt ? 'Gerencie suas preferências de notificação' : 'Manage your notification preferences'}
        >
          <div className="space-y-3">
            <NotificationRow
              icon={BellRing}
              title={isPt ? 'Notificações por e-mail' : 'Email notifications'}
              checked={notifications.email}
              onChange={(v) => setNotifications(prev => ({ ...prev, email: v }))}
            />
            <NotificationRow
              icon={CalendarClock}
              title={isPt ? 'Tarefas e prazos' : 'Tasks and deadlines'}
              checked={notifications.tasks}
              onChange={(v) => setNotifications(prev => ({ ...prev, tasks: v }))}
            />
            <NotificationRow
              icon={UserPlus}
              title={isPt ? 'Convites de organização' : 'Organization invites'}
              checked={notifications.invites}
              onChange={(v) => setNotifications(prev => ({ ...prev, invites: v }))}
            />
          </div>
        </SettingsCard>

        {/* ── Dados e Exportação ── */}
        <Collapsible>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <CollapsibleTrigger className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-foreground">{isPt ? 'Dados e Exportação' : 'Data & Export'}</h2>
                  <p className="text-xs text-muted-foreground">{isPt ? 'Exporte seus dados ou limpe o cache' : 'Export your data or clear cache'}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/40 divide-y divide-border/40">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <HardDriveDownload className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{isPt ? 'Exportar dados' : 'Export data'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportLoading} className="gap-1.5 rounded-lg h-8 px-3 text-xs font-semibold">
                    <Download className="w-3.5 h-3.5" />
                    {exportLoading ? (isPt ? 'Exportando...' : 'Exporting...') : (isPt ? 'Exportar' : 'Export')}
                  </Button>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium text-foreground">{isPt ? 'Limpar cache local' : 'Clear local cache'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-1.5 rounded-lg h-8 px-3 text-xs font-semibold text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5">
                    <Trash2 className="w-3.5 h-3.5" />
                    {isPt ? 'Limpar' : 'Clear'}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

      </div>
    </div>
  );
};

/* ─── Settings Card ─── */
const SettingsCard = ({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

/* ─── Notification Row ─── */
const NotificationRow = ({
  icon: Icon,
  title,
  checked,
  onChange,
}: {
  icon: any;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 transition-colors ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default SettingsPage;
