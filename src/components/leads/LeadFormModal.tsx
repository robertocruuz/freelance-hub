import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Lead, LeadStage } from '@/hooks/useLeads';
import ClientSelect from '@/components/ClientSelect';
import type { Client } from '@/hooks/useClients';
import { maskCurrency, unmaskCurrency, maskPhone } from '@/lib/masks';

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
  lead?: Lead | null;
  stages: LeadStage[];
  defaultStageId?: string;
}

export default function LeadFormModal({ open, onClose, onSave, lead, stages, defaultStageId }: LeadFormModalProps) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [probability, setProbability] = useState(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stageId, setStageId] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (lead) {
      setTitle(lead.title);
      setValue(maskCurrency(String(Math.round(lead.value * 100))));
      setProbability(lead.probability);
      setExpectedCloseDate(lead.expected_close_date || '');
      setContactName(lead.contact_name || '');
      setContactEmail(lead.contact_email || '');
      setContactPhone(lead.contact_phone || '');
      setNotes(lead.notes || '');
      setStageId(lead.stage_id || '');
      setClientId(lead.client_id || '');
    } else {
      setTitle('');
      setValue('');
      setProbability(50);
      setExpectedCloseDate('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setNotes('');
      setStageId(defaultStageId || stages[0]?.id || '');
      setClientId('');
    }
  }, [lead, open, defaultStageId, stages]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      value: unmaskCurrency(value),
      probability,
      expected_close_date: expectedCloseDate || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      notes: notes || null,
      stage_id: stageId || null,
      client_id: clientId || null,
    });
    onClose();
  };

  const probColor = probability >= 70 ? 'text-green-500' : probability >= 40 ? 'text-yellow-500' : 'text-red-400';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Negócio' : 'Novo Negócio'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do negócio" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input value={value} onChange={e => setValue(maskCurrency(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label>Etapa</Label>
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Probabilidade: <span className={probColor}>{probability}%</span></Label>
            <Slider
              value={[probability]}
              onValueChange={v => setProbability(v[0])}
              min={0} max={100} step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Data esperada de fechamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expectedCloseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedCloseDate
                    ? format(parse(expectedCloseDate, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedCloseDate ? parse(expectedCloseDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => setExpectedCloseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                  locale={ptBR}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Cliente</Label>
            <ClientSelect
              value={clientId}
              onChange={setClientId}
              onClientChange={(client: Client | null) => {
                if (client) {
                  if (!contactName && client.responsible) setContactName(client.responsible);
                  if (!contactEmail && client.email) setContactEmail(client.email);
                  if (!contactPhone && client.phone) setContactPhone(client.phone);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Contato</Label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nome" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="email@..." />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={contactPhone} onChange={e => setContactPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
