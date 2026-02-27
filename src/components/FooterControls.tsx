import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';

const FooterControls = () => {
  const { isDark, toggle } = useTheme();
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
        aria-label="Toggle dark mode"
      >
        {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
      </button>
      <button
        onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
        className="text-xs font-medium px-2 py-1 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors text-foreground"
      >
        {lang === 'pt-BR' ? 'PT-BR' : 'EN'}
      </button>
    </div>
  );
};

export default FooterControls;
