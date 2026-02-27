import { useNavigate } from 'react-router-dom';
import { User, HelpCircle } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import SparkleIcon from '@/components/SparkleIcon';
import FooterControls from '@/components/FooterControls';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen flex flex-col hero-gradient overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <h2 className="text-xl font-bold font-display text-primary-foreground">Logo</h2>
        <button
          onClick={() => navigate('/login')}
          className="w-10 h-10 rounded-full border border-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/10 transition-colors"
        >
          <User className="w-5 h-5 text-primary-foreground" />
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-fade-in">
          <div className="relative inline-block">
            <SparkleIcon className="absolute -left-12 top-1/2 -translate-y-1/2" />
            <SparkleIcon className="absolute -right-12 top-1/2 -translate-y-1/2 delay-300" />
            <h1 className="text-5xl md:text-7xl font-bold font-display text-gradient leading-tight whitespace-pre-line">
              {t.heroTitle}
            </h1>
          </div>
          <p className="mt-6 text-lg text-primary-foreground/60 max-w-md mx-auto">
            {t.heroSubtitle}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
          >
            {t.cta}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-6">
        <FooterControls />
        <span className="text-xs text-primary-foreground/40">{t.copyright}</span>
        <button className="w-8 h-8 rounded-full border border-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/10 transition-colors">
          <HelpCircle className="w-4 h-4 text-primary-foreground/60" />
        </button>
      </footer>
    </div>
  );
};

export default LandingPage;
