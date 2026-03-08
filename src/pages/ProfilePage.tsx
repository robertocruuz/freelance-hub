import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, Save, Pencil, X, Lock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profile, setProfile] = useState({ name: '', email: '', document: '' });
  const [editForm, setEditForm] = useState({ name: '', document: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, email, document')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setProfile({ name: data.name || '', email: data.email || user.email || '', document: (data as any).document || '' });
        setEditForm({ name: data.name || '', document: (data as any).document || '' });
      } else {
        setProfile({ name: user.user_metadata?.name || '', email: user.email || '', document: '' });
        setEditForm({ name: user.user_metadata?.name || '', document: '' });
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: editForm.name, document: editForm.document } as any)
      .eq('user_id', user.id);
    setLoading(false);
    if (error) {
      toast({ title: lang === 'pt-BR' ? 'Erro ao salvar' : 'Error saving', variant: 'destructive' });
    } else {
      setProfile((p) => ({ ...p, name: editForm.name }));
      setEditing(false);
      toast({ title: lang === 'pt-BR' ? 'Perfil atualizado!' : 'Profile updated!' });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.password.length < 6) {
      toast({ title: lang === 'pt-BR' ? 'A senha deve ter pelo menos 6 caracteres' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast({ title: lang === 'pt-BR' ? 'As senhas não coincidem' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    setLoading(false);
    if (error) {
      toast({ title: lang === 'pt-BR' ? 'Erro ao alterar senha' : 'Error changing password', variant: 'destructive' });
    } else {
      setChangingPassword(false);
      setPasswordForm({ password: '', confirmPassword: '' });
      toast({ title: lang === 'pt-BR' ? 'Senha alterada com sucesso!' : 'Password changed successfully!' });
    }
  };

  const initials = (profile.name || profile.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const createdAt = user?.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t.profile}</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="w-16 h-16 text-lg">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl">{profile.name || profile.email}</CardTitle>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              {lang === 'pt-BR' ? 'Editar' : 'Edit'}
            </Button>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <User className="w-4 h-4" />
              {lang === 'pt-BR' ? 'Nome' : 'Name'}
            </Label>
            {editing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={lang === 'pt-BR' ? 'Seu nome' : 'Your name'}
              />
            ) : (
              <p className="text-foreground font-medium">{profile.name || '—'}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <p className="text-foreground font-medium">{profile.email}</p>
          </div>

          {/* Created at */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {lang === 'pt-BR' ? 'Membro desde' : 'Member since'}
            </Label>
            <p className="text-foreground font-medium">{createdAt}</p>
          </div>

          {/* Edit actions */}
          {editing && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={loading} size="sm">
                <Save className="w-4 h-4 mr-1" />
                {t.save}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditForm({ name: profile.name }); }}>
                <X className="w-4 h-4 mr-1" />
                {t.cancel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {lang === 'pt-BR' ? 'Alterar Senha' : 'Change Password'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!changingPassword ? (
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
              {lang === 'pt-BR' ? 'Alterar senha' : 'Change password'}
            </Button>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>{lang === 'pt-BR' ? 'Nova senha' : 'New password'}</Label>
                <Input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{lang === 'pt-BR' ? 'Confirmar senha' : 'Confirm password'}</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={loading} size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  {t.save}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setChangingPassword(false); setPasswordForm({ password: '', confirmPassword: '' }); }}>
                  <X className="w-4 h-4 mr-1" />
                  {t.cancel}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
