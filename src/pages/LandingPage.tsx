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
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
      <div className="window-container flex-1 flex flex-col">
        {/* Header */}
        <header className="window-header justify-between">
          <div className="window-tab">
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Logo</h2>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggle} className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-brand-neon transition-colors dark:border-white">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="px-4 py-1.5 rounded-full border-2 border-black font-bold text-sm hover:bg-brand-pink transition-colors dark:border-white">
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-1.5 rounded-full bg-black text-white font-bold hover:bg-brand-blue transition-colors dark:bg-white dark:text-black"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center bg-[#e9e8e0] dark:bg-black/20">
          <div className="animate-fade-in max-w-4xl">
            <div className="relative inline-block mb-8">
              <SparkleIcon className="absolute -left-16 top-1/2 -translate-y-1/2 w-10 h-10 text-brand-blue" />
              <SparkleIcon className="absolute -right-16 top-1/2 -translate-y-1/2 delay-300 w-10 h-10 text-brand-pink" />
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9]">
                {t.heroTitle}
              </h1>
            </div>
            <p className="text-xl font-bold text-foreground/70 uppercase tracking-widest max-w-2xl mx-auto mb-10">
              {t.heroSubtitle}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-brand bg-brand-neon text-2xl px-12 py-4 uppercase italic font-black"
            >
              {t.cta}
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-12 border-t-[3px] border-black flex items-center justify-center px-8 dark:border-white">
          <span className="text-xs font-bold uppercase tracking-widest">{t.copyright}</span>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
