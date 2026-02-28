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
      className="w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black outline-none font-bold dark:border-white dark:bg-black dark:text-white"
    >
      <option value="">{placeholder}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
};

export default ClientSelect;
