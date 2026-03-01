import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import SparkleIcon from '@/components/SparkleIcon';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <h2 className="text-xl font-black font-display text-foreground tracking-tighter uppercase italic">Logo</h2>
        <div className="flex items-center gap-3">
          <button onClick={toggle} className="w-10 h-10 brutalist-button flex items-center justify-center p-0">
            {isDark ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
          </button>
          <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="h-10 px-4 brutalist-button text-xs font-bold text-foreground">
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-10 h-10 brutalist-button-primary rounded-full flex items-center justify-center p-0"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-fade-in">
          <div className="relative inline-block mb-8">
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:block">
              <SparkleIcon className="text-accent w-12 h-12" />
            </div>
            <div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:block">
              <SparkleIcon className="text-secondary w-12 h-12" />
            </div>

            <h1 className="text-5xl md:text-8xl font-black font-display text-foreground leading-[0.9] whitespace-pre-line uppercase tracking-tighter">
              <span className="block">{t.heroTitle.split('\n')[0]}</span>
              <span className="block text-primary bg-secondary inline-block px-4 py-2 border-4 border-foreground mt-2 rotate-[-2deg] shadow-brutalist">
                {t.heroTitle.split('\n')[1] || ''}
              </span>
            </h1>
          </div>

          <div className="brutalist-card bg-accent/10 max-w-lg mx-auto p-6 mt-8">
            <p className="text-xl font-bold text-foreground italic">
              {t.heroSubtitle}
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="mt-12 px-10 py-5 brutalist-button-primary text-xl uppercase tracking-widest italic"
          >
            {t.cta}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 py-8 border-t-4 border-foreground bg-secondary/20 mt-12">
        <span className="text-sm font-black uppercase tracking-widest text-foreground">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default LandingPage;
