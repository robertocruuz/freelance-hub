import { useClients } from '@/hooks/useClients';

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
      className="brutalist-input w-full h-12"
    >
      <option value="">{placeholder}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
};

export default ClientSelect;
