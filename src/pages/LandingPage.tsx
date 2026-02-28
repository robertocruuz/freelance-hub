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
    <div className="min-h-screen bg-[#e9e8e0] dark:bg-background p-4 md:p-8 flex flex-col">
      <div className="window-container flex-1 flex flex-col bg-transparent border-none shadow-none">
        {/* Header */}
        <header className="window-header justify-between">
          <div className="window-tab">
            <h2 className="text-2xl uppercase">Logo</h2>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="px-3 py-1 font-black text-xs hover:text-brand-pink transition-colors">
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform dark:bg-white dark:text-black"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
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
        <footer className="h-16 flex items-end justify-between px-2">
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-2xl border-[3px] border-black flex items-center justify-center hover:bg-brand-neon transition-all active:scale-95 bg-white dark:border-white dark:bg-black"
          >
            {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{t.copyright}</span>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
