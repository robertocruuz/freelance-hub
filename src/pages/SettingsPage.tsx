import { useI18n } from '@/hooks/useI18n';
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
import { Sun, Moon, Monitor, Globe, Bell, Database, Download, Trash2, Palette, Languages, BellRing, CalendarClock, UserPlus, ArrowDownToLine, HardDriveDownload, Sparkles } from 'lucide-react';
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.settings}</h1>
            <p className="text-sm text-muted-foreground">
              {isPt ? 'Personalize sua experiência' : 'Customize your experience'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* ═══════════════════════════════════════ */}
        {/* APPEARANCE SECTION */}
        {/* ═══════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Palette}
            title={isPt ? 'Aparência' : 'Appearance'}
            description={isPt ? 'Escolha como o Freelaz se parece' : 'Choose how Freelaz looks'}
          />

          <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${isSelected
                      ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <opt.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : ''}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="border-t border-border/40" />

        {/* ═══════════════════════════════════════ */}
        {/* LANGUAGE SECTION */}
        {/* ═══════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Languages}
            title={isPt ? 'Idioma' : 'Language'}
            description={isPt ? 'Defina o idioma da interface' : 'Set the interface language'}
          />

          <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
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
                      ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span className="text-base">{opt.flag}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="border-t border-border/40" />

        {/* ═══════════════════════════════════════ */}
        {/* NOTIFICATIONS SECTION */}
        {/* ═══════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Bell}
            title={isPt ? 'Notificações' : 'Notifications'}
            description={isPt ? 'Gerencie suas preferências de notificação' : 'Manage your notification preferences'}
          />

          <div className="mt-4 rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
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
        </section>

        <div className="border-t border-border/40" />

        {/* ═══════════════════════════════════════ */}
        {/* DATA SECTION */}
        {/* ═══════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Database}
            title={isPt ? 'Dados e Exportação' : 'Data & Export'}
            description={isPt ? 'Exporte seus dados ou limpe o cache local' : 'Export your data or clear local cache'}
          />

          <div className="mt-4 space-y-3">
            {/* Export */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <HardDriveDownload className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isPt ? 'Exportar dados' : 'Export data'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPt ? 'Baixe todos os seus dados em JSON' : 'Download all your data in JSON format'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportLoading} className="gap-1.5 rounded-xl h-9 px-4 font-semibold">
                <Download className="w-3.5 h-3.5" />
                {exportLoading ? (isPt ? 'Exportando...' : 'Exporting...') : (isPt ? 'Exportar' : 'Export')}
              </Button>
            </div>

            {/* Clear cache */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isPt ? 'Limpar cache local' : 'Clear local cache'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPt ? 'Remove dados temporários do navegador' : 'Remove temporary data from the browser'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-1.5 rounded-xl h-9 px-4 font-semibold text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40">
                <Trash2 className="w-3.5 h-3.5" />
                {isPt ? 'Limpar' : 'Clear'}
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

/* ─── Section Header ─── */
const SectionHeader = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-4.5 h-4.5 text-primary" />
    </div>
    <div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  </div>
);

/* ─── Notification Row ─── */
const NotificationRow = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary/10' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 transition-colors ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default SettingsPage;
