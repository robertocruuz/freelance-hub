import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Monitor, Globe, Bell, BellOff, Database, Download, Trash2 } from 'lucide-react';
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
    { value: 'light', label: isPt ? 'Claro' : 'Light', icon: Sun },
    { value: 'dark', label: isPt ? 'Escuro' : 'Dark', icon: Moon },
    { value: 'system', label: isPt ? 'Sistema' : 'System', icon: Monitor },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.settings}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt ? 'Personalize sua experiência e gerencie seus dados' : 'Customize your experience and manage your data'}
        </p>
      </div>

      {/* Theme Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Aparência' : 'Appearance'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Escolha o tema visual da aplicação' : 'Choose the visual theme of the application'}
            </CardDescription>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <opt.icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {isPt ? 'Ativo' : 'Active'}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Idioma' : 'Language'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Defina o idioma da interface' : 'Set the interface language'}
            </CardDescription>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {isPt ? 'Idioma da interface' : 'Interface language'}
            </Label>
            <Select value={lang} onValueChange={(v) => setLang(v as any)}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">
                  <span className="flex items-center gap-2">🇧🇷 Português (Brasil)</span>
                </SelectItem>
                <SelectItem value="en">
                  <span className="flex items-center gap-2">🇺🇸 English</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Notificações' : 'Notifications'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Gerencie suas preferências de notificação' : 'Manage your notification preferences'}
            </CardDescription>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isPt ? 'Notificações por e-mail' : 'Email notifications'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPt ? 'Receba atualizações importantes por e-mail' : 'Receive important updates by email'}
                </p>
              </div>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isPt ? 'Tarefas e prazos' : 'Tasks and deadlines'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPt ? 'Lembretes de tarefas e vencimentos' : 'Task and due date reminders'}
                </p>
              </div>
            </div>
            <Switch
              checked={notifications.tasks}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, tasks: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isPt ? 'Convites de organização' : 'Organization invites'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPt ? 'Notificações sobre novos convites' : 'Notifications about new invites'}
                </p>
              </div>
            </div>
            <Switch
              checked={notifications.invites}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, invites: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Export Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{isPt ? 'Dados e Exportação' : 'Data & Export'}</CardTitle>
            <CardDescription className="mt-0.5">
              {isPt ? 'Exporte seus dados ou limpe o cache local' : 'Export your data or clear local cache'}
            </CardDescription>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isPt ? 'Exportar dados' : 'Export data'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPt ? 'Baixe todos os seus dados em formato JSON' : 'Download all your data in JSON format'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportLoading} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {isPt ? 'Exportar' : 'Export'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isPt ? 'Limpar cache local' : 'Clear local cache'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPt ? 'Remove dados temporários armazenados no navegador' : 'Remove temporary data stored in the browser'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {isPt ? 'Limpar' : 'Clear'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
