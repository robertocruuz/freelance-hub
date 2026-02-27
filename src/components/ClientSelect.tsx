import { useClients, type Client } from '@/hooks/useClients';

interface ClientSelectProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

const ClientSelect = ({ value, onChange, placeholder = 'Cliente' }: ClientSelectProps) => {
  const { clients } = useClients();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
    >
      <option value="">{placeholder}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
};

export default ClientSelect;
