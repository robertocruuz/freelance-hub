import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Save, Pencil, X, Lock, FileText, Building2, Phone, Globe, Shield, Users, ChevronDown, MapPin } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { brazilianStates, fetchCitiesByState } from '@/lib/brazilData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import OrgMembersCard from '@/components/OrgMembersCard';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { maskCPF, maskCNPJ, maskPhone, maskCEP } from '@/lib/masks';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDetailsOpen, setOrgDetailsOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [statePopoverOpen, setStatePopoverOpen] = useState(false);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);

  const [profile, setProfile] = useState({ name: '', email: '', document: '', phone: '' });
  const [editForm, setEditForm] = useState({ name: '', document: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [org, setOrg] = useState({ company_name: '', trade_name: '', cnpj: '', state_registration: '', municipal_registration: '', business_email: '', business_phone: '', website: '', zip_code: '', address: '', state: '', city: '' });
  const [orgForm, setOrgForm] = useState({ company_name: '', trade_name: '', cnpj: '', state_registration: '', municipal_registration: '', business_email: '', business_phone: '', website: '', zip_code: '', address: '', state: '', city: '' });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, email, document, phone')
        .eq('user_id', user.id)
        .single();
      if (data) {
        const d = data as any;
        setProfile({ name: d.name || '', email: d.email || user.email || '', document: d.document || '', phone: d.phone || '' });
        setEditForm({ name: d.name || '', document: d.document || '', phone: d.phone || '' });
      } else {
        setProfile({ name: user.user_metadata?.name || '', email: user.email || '', document: '', phone: '' });
        setEditForm({ name: user.user_metadata?.name || '', document: '', phone: '' });
      }

      const { data: orgData } = await supabase
        .from('organizations' as any)
        .select('company_name, trade_name, cnpj, state_registration, municipal_registration, business_email, business_phone, website, zip_code, address, state, city')
        .eq('user_id', user.id)
        .single();
      if (orgData) {
        const o = orgData as any;
        const orgState = {
          company_name: o.company_name || '',
          trade_name: o.trade_name || '',
          cnpj: o.cnpj || '',
          state_registration: o.state_registration || '',
          municipal_registration: o.municipal_registration || '',
          business_email: o.business_email || '',
          business_phone: o.business_phone || '',
          website: o.website || '',
          address: o.address || '',
          state: o.state || '',
          city: o.city || '',
        };
        setOrg(orgState);
        setOrgForm(orgState);
      }
    };
    fetchProfile();
  }, [user]);

  // Load cities when orgForm.state changes
  useEffect(() => {
    if (!orgForm.state) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    fetchCitiesByState(orgForm.state).then((c) => {
      setCities(c);
      setCitiesLoading(false);
    });
  }, [orgForm.state]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: editForm.name, document: editForm.document, phone: editForm.phone } as any)
      .eq('user_id', user.id);
    setLoading(false);
    if (error) {
      toast({ title: lang === 'pt-BR' ? 'Erro ao salvar' : 'Error saving', variant: 'destructive' });
    } else {
      setProfile((p) => ({ ...p, name: editForm.name, document: editForm.document, phone: editForm.phone }));
      setEditing(false);
      toast({ title: lang === 'pt-BR' ? 'Perfil atualizado!' : 'Profile updated!' });
    }
  };

  const handleSaveOrg = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await (supabase.from('organizations' as any) as any).upsert({
      user_id: user.id,
      ...orgForm,
    }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast({ title: lang === 'pt-BR' ? 'Erro ao salvar' : 'Error saving', variant: 'destructive' });
    } else {
      setOrg({ ...orgForm });
      setEditingOrg(false);
      toast({ title: lang === 'pt-BR' ? 'Organização atualizada!' : 'Organization updated!' });
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

  const ActionButtons = ({ onSave, onCancel, saveLabel }: { onSave: () => void; onCancel: () => void; saveLabel?: string }) => (
    <div className="flex items-center gap-2 pt-4">
      <Button onClick={onSave} disabled={loading} size="sm" className="gap-1.5">
        <Save className="w-4 h-4" />
        {saveLabel || t.save}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 text-muted-foreground">
        <X className="w-4 h-4" />
        {t.cancel}
      </Button>
    </div>
  );

  const FieldDisplay = ({ value }: { value: string }) => (
    <p className="text-foreground font-medium text-sm py-1.5">{value || '—'}</p>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.profile}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'pt-BR' ? 'Gerencie suas informações pessoais e da sua empresa' : 'Manage your personal and company information'}
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{profile.name || profile.email}</CardTitle>
            <CardDescription className="mt-0.5">
              {lang === 'pt-BR' ? 'Informações pessoais' : 'Personal information'}
            </CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              {lang === 'pt-BR' ? 'Editar' : 'Edit'}
            </Button>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {lang === 'pt-BR' ? 'Nome completo' : 'Full name'}
              </Label>
              {editing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={lang === 'pt-BR' ? 'Seu nome completo' : 'Your full name'}
                />
              ) : (
                <FieldDisplay value={profile.name} />
              )}
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                CPF
              </Label>
              {editing ? (
                <Input
                  value={editForm.document}
                  onChange={(e) => setEditForm({ ...editForm, document: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              ) : (
                <FieldDisplay value={profile.document} />
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {lang === 'pt-BR' ? 'Telefone' : 'Phone'}
              </Label>
              {editing ? (
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              ) : (
                <FieldDisplay value={profile.phone} />
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Label>
              <FieldDisplay value={profile.email} />
            </div>

            {/* Member since */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {lang === 'pt-BR' ? 'Membro desde' : 'Member since'}
              </Label>
              <FieldDisplay value={createdAt} />
            </div>
          </div>

          {editing && (
            <ActionButtons
              onSave={handleSave}
              onCancel={() => { setEditing(false); setEditForm({ name: profile.name, document: profile.document, phone: profile.phone }); }}
            />
          )}
        </CardContent>
      </Card>

      {/* Organization Card */}
      <Collapsible open={orgDetailsOpen || editingOrg} onOpenChange={setOrgDetailsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-start justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {org.trade_name || org.company_name || (lang === 'pt-BR' ? 'Organização' : 'Organization')}
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {lang === 'pt-BR' ? 'Dados da sua empresa' : 'Your company data'}
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 mt-2 ${orgDetailsOpen || editingOrg ? 'rotate-0' : '-rotate-90'}`} />
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <Separator />

            <CardContent className="pt-5 pb-6 space-y-6">
              {/* Company info section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {lang === 'pt-BR' ? 'Informações da empresa' : 'Company information'}
                  </p>
                  {!editingOrg && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditingOrg(true); }} className="gap-1.5 shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                      {lang === 'pt-BR' ? 'Editar' : 'Edit'}
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Identification section */}
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {lang === 'pt-BR' ? 'Razão Social' : 'Company Name'}
                        </Label>
                        {editingOrg ? (
                          <Input value={orgForm.company_name} onChange={(e) => setOrgForm({ ...orgForm, company_name: e.target.value })} placeholder={lang === 'pt-BR' ? 'Nome da empresa' : 'Company name'} />
                        ) : (
                          <FieldDisplay value={org.company_name} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {lang === 'pt-BR' ? 'Nome Fantasia' : 'Trade Name'}
                        </Label>
                        {editingOrg ? (
                          <Input value={orgForm.trade_name} onChange={(e) => setOrgForm({ ...orgForm, trade_name: e.target.value })} placeholder={lang === 'pt-BR' ? 'Nome fantasia' : 'Trade name'} />
                        ) : (
                          <FieldDisplay value={org.trade_name} />
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  {/* Tax section */}
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">CNPJ</Label>
                        {editingOrg ? (
                          <Input value={orgForm.cnpj} onChange={(e) => setOrgForm({ ...orgForm, cnpj: maskCNPJ(e.target.value) })} placeholder="00.000.000/0001-00" maxLength={18} />
                        ) : (
                          <FieldDisplay value={org.cnpj} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            {lang === 'pt-BR' ? 'Inscrição Estadual' : 'State Reg.'}
                          </Label>
                          {editingOrg && (
                            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                              <Checkbox
                                className="w-3.5 h-3.5"
                                checked={orgForm.state_registration === 'ISENTO'}
                                onCheckedChange={(checked) => setOrgForm({ ...orgForm, state_registration: checked ? 'ISENTO' : '' })}
                              />
                              {lang === 'pt-BR' ? 'Isento' : 'Exempt'}
                            </label>
                          )}
                        </div>
                        {editingOrg ? (
                          <Input
                            value={orgForm.state_registration}
                            onChange={(e) => setOrgForm({ ...orgForm, state_registration: e.target.value })}
                            placeholder={lang === 'pt-BR' ? 'Opcional' : 'Optional'}
                            disabled={orgForm.state_registration === 'ISENTO'}
                            className={orgForm.state_registration === 'ISENTO' ? 'opacity-50' : ''}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FieldDisplay value={org.state_registration} />
                            {org.state_registration === 'ISENTO' && (
                              <Badge variant="secondary" className="text-[10px] h-5">{lang === 'pt-BR' ? 'Isento' : 'Exempt'}</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            {lang === 'pt-BR' ? 'Inscrição Municipal' : 'Municipal Reg.'}
                          </Label>
                          {editingOrg && (
                            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                              <Checkbox
                                className="w-3.5 h-3.5"
                                checked={orgForm.municipal_registration === 'ISENTO'}
                                onCheckedChange={(checked) => setOrgForm({ ...orgForm, municipal_registration: checked ? 'ISENTO' : '' })}
                              />
                              {lang === 'pt-BR' ? 'Isento' : 'Exempt'}
                            </label>
                          )}
                        </div>
                        {editingOrg ? (
                          <Input
                            value={orgForm.municipal_registration}
                            onChange={(e) => setOrgForm({ ...orgForm, municipal_registration: e.target.value })}
                            placeholder={lang === 'pt-BR' ? 'Opcional' : 'Optional'}
                            disabled={orgForm.municipal_registration === 'ISENTO'}
                            className={orgForm.municipal_registration === 'ISENTO' ? 'opacity-50' : ''}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FieldDisplay value={org.municipal_registration} />
                            {org.municipal_registration === 'ISENTO' && (
                              <Badge variant="secondary" className="text-[10px] h-5">{lang === 'pt-BR' ? 'Isento' : 'Exempt'}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  {/* Address section */}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {lang === 'pt-BR' ? 'Endereço' : 'Address'}
                    </p>
                    <div className="grid grid-cols-1 gap-y-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {lang === 'pt-BR' ? 'Endereço' : 'Address'}
                        </Label>
                        {editingOrg ? (
                          <Input value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} placeholder={lang === 'pt-BR' ? 'Rua, número, complemento, bairro' : 'Street, number, complement, neighborhood'} />
                        ) : (
                          <FieldDisplay value={org.address} />
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {/* State */}
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">
                            {lang === 'pt-BR' ? 'Estado' : 'State'}
                          </Label>
                          {editingOrg ? (
                            <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal" onClick={(e) => e.stopPropagation()}>
                                  {orgForm.state
                                    ? brazilianStates.find(s => s.value === orgForm.state)?.label || orgForm.state
                                    : (lang === 'pt-BR' ? 'Selecione o estado' : 'Select state')}
                                  <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder={lang === 'pt-BR' ? 'Buscar estado...' : 'Search state...'} />
                                  <CommandList>
                                    <CommandEmpty>{lang === 'pt-BR' ? 'Nenhum estado encontrado' : 'No state found'}</CommandEmpty>
                                    <CommandGroup>
                                      {brazilianStates.map((state) => (
                                        <CommandItem
                                          key={state.value}
                                          value={state.label}
                                          onSelect={() => {
                                            setOrgForm({ ...orgForm, state: state.value, city: '' });
                                            setStatePopoverOpen(false);
                                          }}
                                        >
                                          {state.label} ({state.value})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <FieldDisplay value={orgForm.state ? (brazilianStates.find(s => s.value === org.state)?.label || org.state) : ''} />
                          )}
                        </div>

                        {/* City */}
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">
                            {lang === 'pt-BR' ? 'Cidade' : 'City'}
                          </Label>
                          {editingOrg ? (
                            <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal" onClick={(e) => e.stopPropagation()} disabled={!orgForm.state}>
                                  {orgForm.city || (lang === 'pt-BR' ? 'Selecione a cidade' : 'Select city')}
                                  <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder={lang === 'pt-BR' ? 'Buscar cidade...' : 'Search city...'} />
                                  <CommandList>
                                    <CommandEmpty>
                                      {citiesLoading
                                        ? (lang === 'pt-BR' ? 'Carregando...' : 'Loading...')
                                        : (lang === 'pt-BR' ? 'Nenhuma cidade encontrada' : 'No city found')}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {cities.map((city) => (
                                        <CommandItem
                                          key={city}
                                          value={city}
                                          onSelect={() => {
                                            setOrgForm({ ...orgForm, city });
                                            setCityPopoverOpen(false);
                                          }}
                                        >
                                          {city}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <FieldDisplay value={org.city} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact section */}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {lang === 'pt-BR' ? 'Contato Comercial' : 'Business Contact'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {lang === 'pt-BR' ? 'Email Comercial' : 'Business Email'}
                        </Label>
                        {editingOrg ? (
                          <Input type="email" value={orgForm.business_email} onChange={(e) => setOrgForm({ ...orgForm, business_email: e.target.value })} placeholder="contato@empresa.com" />
                        ) : (
                          <FieldDisplay value={org.business_email} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {lang === 'pt-BR' ? 'Telefone' : 'Phone'}
                        </Label>
                        {editingOrg ? (
                          <Input value={orgForm.business_phone} onChange={(e) => setOrgForm({ ...orgForm, business_phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} />
                        ) : (
                          <FieldDisplay value={org.business_phone} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Site</Label>
                        {editingOrg ? (
                          <Input value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} placeholder="https://www.empresa.com" />
                        ) : (
                          <FieldDisplay value={org.website} />
                        )}
                      </div>
                    </div>
                  </div>

                  {editingOrg && (
                    <ActionButtons
                      onSave={handleSaveOrg}
                      onCancel={() => { setEditingOrg(false); setOrgForm({ ...org }); }}
                    />
                  )}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Team section (embedded) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {lang === 'pt-BR' ? 'Equipe' : 'Team'}
                  </p>
                </div>
                <OrgMembersCard embedded />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Security Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {lang === 'pt-BR' ? 'Segurança' : 'Security'}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {lang === 'pt-BR' ? 'Gerencie sua senha de acesso' : 'Manage your access password'}
            </CardDescription>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 pb-6">
          {!changingPassword ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{lang === 'pt-BR' ? 'Senha' : 'Password'}</p>
                  <p className="text-xs text-muted-foreground">••••••••</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                {lang === 'pt-BR' ? 'Alterar' : 'Change'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{lang === 'pt-BR' ? 'Nova senha' : 'New password'}</Label>
                  <Input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{lang === 'pt-BR' ? 'Confirmar senha' : 'Confirm password'}</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <ActionButtons
                onSave={handleChangePassword}
                onCancel={() => { setChangingPassword(false); setPasswordForm({ password: '', confirmPassword: '' }); }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
