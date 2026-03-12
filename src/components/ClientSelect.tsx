import { useState, useRef, useEffect } from 'react';
import { useClients, type Client } from '@/hooks/useClients';
import { ChevronDown, X } from 'lucide-react';

interface ClientSelectProps {
  value: string;
  onChange: (id: string) => void;
  onClientChange?: (client: Client | null) => void;
  placeholder?: string;
}

const ClientSelect = ({ value, onChange, placeholder = 'Cliente' }: ClientSelectProps) => {
  const { clients } = useClients();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected ? (
            <>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: (selected as any).color || 'hsl(var(--muted-foreground))' }}
              />
              <span className="text-foreground truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded-full hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {clients.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum cliente</p>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors ${c.id === value ? 'bg-muted font-medium' : ''}`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: (c as any).color || 'hsl(var(--muted-foreground))' }}
                />
                <span className="truncate text-foreground">{c.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSelect;
