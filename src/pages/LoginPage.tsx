import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Lock, User, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Conta criada! Verifique seu email para confirmar.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          navigate('/dashboard/passwords');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background blocks */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-secondary border-8 border-foreground rotate-12 -z-10 shadow-brutalist-lg hidden md:block"></div>
      <div className="absolute bottom-10 right-10 w-36 h-36 bg-accent border-8 border-foreground -rotate-6 -z-10 shadow-brutalist-lg hidden md:block"></div>
      <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-primary border-4 border-foreground rotate-45 -z-10 shadow-brutalist hidden md:block"></div>

      <div className="w-full max-w-md brutalist-card p-10 animate-fade-in bg-card border-4">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary border-4 border-foreground rounded-full flex items-center justify-center mb-6 rotate-[-10deg] shadow-brutalist-sm">
             <Lock className="w-8 h-8 text-primary-foreground stroke-[3]" />
          </div>
          <h2 className="text-5xl font-black font-display text-center text-foreground uppercase tracking-tighter italic">
            {isRegister ? t.register : t.login}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {isRegister && (
            <div className="space-y-1 group">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                 <User className="w-3 h-3" /> {t.title}
              </label>
              <input
                type="text"
                placeholder={t.title}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full brutalist-input text-lg"
              />
            </div>
          )}
          <div className="space-y-1 group">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
               <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full brutalist-input text-lg"
              required
            />
          </div>
          <div className="space-y-1 relative group">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
               <Lock className="w-3 h-3" /> {t.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full brutalist-input pr-12 text-lg"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:text-primary transition-colors border-none bg-transparent p-0"
              >
                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 brutalist-button-primary text-2xl uppercase font-black italic mt-4 disabled:opacity-50"
          >
            {loading ? '...' : isRegister ? t.register : t.login}
            <ArrowRight className="w-8 h-8 ml-2 stroke-[3]" />
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4">
            <div className="h-1 bg-foreground/10 w-full rounded-full"></div>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-xs font-black uppercase tracking-widest text-foreground/60 hover:text-foreground transition-all text-center underline decoration-[3px] underline-offset-8"
            >
              {isRegister ? t.login : t.register}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
