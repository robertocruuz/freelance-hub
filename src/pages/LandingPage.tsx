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
    <div className="relative min-h-screen flex flex-col hero-gradient overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <h2 className="text-xl font-bold font-display text-foreground tracking-tight">Logo</h2>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center">
            {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
          </button>
          <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="h-9 px-3 rounded-xl glass-pill text-xs font-semibold text-foreground">
            {lang === 'pt-BR' ? 'PT' : 'EN'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-9 h-9 rounded-full glass-pill flex items-center justify-center"
          >
            <User className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-fade-in">
          <div className="relative inline-block">
            <SparkleIcon className="absolute -left-12 top-1/2 -translate-y-1/2" />
            <SparkleIcon className="absolute -right-12 top-1/2 -translate-y-1/2 delay-300" />
            <h1 className="text-5xl md:text-7xl font-bold font-display text-gradient-hero leading-tight whitespace-pre-line">
              {t.heroTitle}
            </h1>
          </div>
          <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
            {t.heroSubtitle}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3.5 rounded-2xl btn-glow text-primary-foreground font-semibold text-lg"
          >
            {t.cta}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 py-6">
        <span className="text-xs text-muted-foreground/50">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default LandingPage;
