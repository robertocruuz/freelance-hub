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
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in fill-mode-forwards opacity-0" style={{ animationDelay: '100ms' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-sm font-semibold text-primary">{isPt ? 'Preferências' : 'Preferences'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            {t.settings}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            {isPt ? 'Personalize sua experiência no Freelaz' : 'Customize your Freelaz experience'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ── Aparência ── */}
        <SettingsCard
          icon={Palette}
          title={isPt ? 'Aparência' : 'Appearance'}
          description={isPt ? 'Escolha como o Freelaz se parece' : 'Choose how Freelaz looks'}
          className="md:col-span-4"
        >
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-muted/50 border border-border/40">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as any)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-200
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
          className="md:col-span-4"
        >
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-muted/50 border border-border/40">
            {[
              { value: 'pt-BR', flag: '🇧🇷', label: 'Português' },
              { value: 'en', flag: '🇺🇸', label: 'English' },
            ].map((opt) => {
              const isSelected = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value as any)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-200
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

        {/* ── Dados e Exportação ── */}
        <SettingsCard
          icon={Database}
          title={isPt ? 'Dados e Exportação' : 'Data & Export'}
          description={isPt ? 'Exporte ou limpe dados locais' : 'Export or clear local data'}
          className="md:col-span-4"
        >
          <div className="flex flex-col gap-3 mt-auto">
            <Button variant="outline" onClick={handleExportData} disabled={exportLoading} className="w-full justify-between rounded-xl h-11 px-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Download className="w-4 h-4 text-muted-foreground" />
                {exportLoading ? (isPt ? 'Exportando...' : 'Exporting...') : (isPt ? 'Exportar dados' : 'Export data')}
              </span>
            </Button>
            <Button variant="outline" onClick={handleClearCache} className="w-full justify-between rounded-xl h-11 px-4 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Trash2 className="w-4 h-4" />
                {isPt ? 'Limpar cache local' : 'Clear local cache'}
              </span>
            </Button>
          </div>
        </SettingsCard>

        {/* ── Notificações ── */}
        <SettingsCard
          icon={Bell}
          title={isPt ? 'Notificações' : 'Notifications'}
          description={isPt ? 'Gerencie suas preferências de notificação' : 'Manage your notification preferences'}
          className="md:col-span-12"
        >
          <div className="space-y-4 pt-1">
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

      </div>
    </div>
  );
};

/* ─── Settings Card ─── */
const SettingsCard = ({ icon: Icon, title, description, className = '', children }: { icon: any; title: string; description: string; className?: string; children: React.ReactNode }) => (
  <div className={`flex flex-col p-6 rounded-[24px] border border-border/50 bg-card/40 hover:bg-card/80 transition-colors shadow-sm ${className}`}>
    <div className="flex items-center gap-4 mb-5">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="flex-1 flex flex-col justify-end">
      {children}
    </div>
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
