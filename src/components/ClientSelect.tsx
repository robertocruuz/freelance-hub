import { useClients, type Client } from '@/hooks/useClients';

interface ClientSelectProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

const ClientSelect = ({ value, onChange, placeholder = 'Cliente' }: ClientSelectProps) => {
  const { clients } = useClients();

  return (
    <div className="space-y-2">
       <label className="text-sm font-bold text-slate-700 ml-1">{placeholder}</label>
       <select
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all appearance-none cursor-pointer"
       >
         <option value="">Select a client...</option>
         {clients.map((c) => (
           <option key={c.id} value={c.id}>{c.name}</option>
         ))}
       </select>
    </div>
  );
};

export default ClientSelect;
