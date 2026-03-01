import { useNavigate } from 'react-router-dom';
import { User, Moon, Sun, ArrowRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import SparkleIcon from '@/components/SparkleIcon';
import { useTheme } from '@/hooks/useTheme';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden selection:bg-accent">
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-black font-display text-foreground tracking-tighter uppercase italic leading-none border-b-4 border-foreground pb-1">Logo</h2>
        <div className="flex items-center gap-4">
          <div className="flex bg-card border-2 border-foreground rounded-lg p-1 shadow-brutalist-sm">
            <button onClick={toggle} className="w-9 h-9 flex items-center justify-center hover:bg-secondary rounded transition-colors p-0 border-none bg-transparent">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')} className="w-9 h-9 flex items-center justify-center hover:bg-accent rounded transition-colors font-black text-xs border-none bg-transparent">
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-12 h-12 brutalist-button-primary rounded-full p-0"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto w-full py-12">
        <div className="animate-fade-in space-y-12">
          <div className="relative inline-block mb-4">
            <div className="absolute -left-20 top-0 hidden md:block rotate-[-12deg]">
              <SparkleIcon className="text-accent w-16 h-16" />
            </div>
            <div className="absolute -right-20 bottom-0 hidden md:block rotate-[12deg]">
              <SparkleIcon className="text-secondary w-16 h-16" />
            </div>

            <h1 className="text-6xl md:text-[120px] font-black font-display text-foreground leading-[0.8] uppercase tracking-tighter text-shadow-brutalist">
              <span className="block">{t.heroTitle.split('\n')[0]}</span>
              <span className="block mt-4 md:mt-8">
                <span className="bg-secondary text-foreground inline-block px-6 py-2 border-[6px] border-foreground rotate-[-3deg] shadow-brutalist-lg">
                  {t.heroTitle.split('\n')[1] || ''}
                </span>
              </span>
              <span className="block mt-4 md:mt-8 text-outline italic">
                 {t.heroTitle.split('\n')[2] || ''}
              </span>
            </h1>
          </div>

          <div className="max-w-xl mx-auto py-8">
            <p className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight italic leading-tight">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => navigate('/login')}
              className="px-12 py-6 brutalist-button-primary text-2xl italic tracking-widest min-w-[300px]"
            >
              {t.cta}
              <ArrowRight className="w-8 h-8 ml-2 stroke-[3]" />
            </button>
          </div>
        </div>
      </main>

      {/* Grid Pattern Background Decoration */}
      <div className="absolute inset-0 -z-20 opacity-5 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(hsl(var(--foreground)) 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

      {/* Footer */}
      <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between px-10 py-10 border-t-8 border-foreground bg-accent/20 mt-20 gap-6">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Logo</h2>
        <span className="text-sm font-black uppercase tracking-[0.3em] text-foreground">{t.copyright}</span>
        <div className="flex gap-8">
            {['Twitter', 'Instagram', 'Github'].map(link => (
                <span key={link} className="text-xs font-black uppercase tracking-widest hover:underline decoration-4 underline-offset-4 cursor-pointer">{link}</span>
            ))}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
