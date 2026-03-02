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
      className="w-full brutalist-input h-12 bg-white text-sm"
    >
      <option value="">{placeholder}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
};

export default ClientSelect;
