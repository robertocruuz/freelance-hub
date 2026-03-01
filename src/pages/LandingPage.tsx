import { useNavigate } from 'react-router-dom';
import { User, Moon, Sun, Globe, ArrowRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import SparkleIcon from '@/components/SparkleIcon';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-brand-offwhite dark:bg-background p-4 md:p-8 flex flex-col font-sans selection:bg-brand-blue/10 selection:text-brand-blue">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:scale-110 transition-transform">
            <span className="text-white font-black text-xl italic">F</span>
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 hidden sm:block">FreelanceHub</h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all"
          >
            <Globe className="w-4 h-4 text-brand-blue" />
            {lang === 'pt-BR' ? 'PT-BR' : 'EN-US'}
          </button>

          <div className="h-6 w-[1px] bg-slate-200" />

          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-900 text-white hover:bg-brand-blue transition-all shadow-lg shadow-slate-900/10 active:scale-95 group"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-bold">{t.login}</span>
            <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-7xl mx-auto">
        <div className="animate-fade-in relative">
          {/* Background Decorative Elements */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-pink/5 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

          <div className="relative inline-block mb-12">
            <SparkleIcon className="absolute -left-12 top-0 md:-left-20 md:top-4 w-10 h-10 text-brand-blue animate-float" />
            <SparkleIcon className="absolute -right-12 bottom-0 md:-right-20 md:bottom-4 delay-300 w-10 h-10 text-brand-pink animate-float" />

            <h1 className="text-6xl md:text-9xl font-display font-bold tracking-tighter text-slate-900 leading-[0.85] uppercase">
              {t.heroTitle}
            </h1>
          </div>

          <p className="text-lg md:text-2xl font-medium text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            {t.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-xl px-12 py-5 h-auto shadow-xl shadow-brand-blue/20 flex items-center gap-3"
            >
              {t.cta}
              <ArrowRight className="w-6 h-6" />
            </button>
            <button className="btn-outline text-xl px-12 py-5 h-auto bg-white hover:bg-slate-50">
               Learn More
            </button>
          </div>

          {/* Social Proof / Features Preview */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-slate-100 pt-12">
             {[
               { label: 'Trusted by', value: '1,000+ Pros' },
               { label: 'Uptime', value: '99.9%' },
               { label: 'Secure', value: 'Vault Encrypted' },
               { label: 'Total Control', value: 'All-in-one' }
             ].map((stat, i) => (
               <div key={i} className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-900">{stat.value}</p>
               </div>
             ))}
          </div>
        </div>
      </main>

      {/* Footer Section */}
      <footer className="flex flex-col md:flex-row items-center justify-between px-6 py-8 max-w-7xl mx-auto w-full border-t border-slate-100 mt-12 gap-6">
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:shadow-md hover:text-brand-blue transition-all active:scale-95 group"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
          {t.copyright}
        </p>

        <div className="flex gap-8">
           <span className="text-xs font-bold text-slate-400 hover:text-brand-blue cursor-pointer transition-colors">Privacy Policy</span>
           <span className="text-xs font-bold text-slate-400 hover:text-brand-blue cursor-pointer transition-colors">Terms of Service</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
