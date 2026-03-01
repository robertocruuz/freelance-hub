import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';
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
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-secondary border-4 border-foreground rotate-12 -z-10 shadow-brutalist hidden md:block"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent border-4 border-foreground -rotate-6 -z-10 shadow-brutalist-lg hidden md:block"></div>

      <div className="w-full max-w-sm brutalist-card p-8 animate-fade-in bg-card">
        <h2 className="text-4xl font-black font-display text-center mb-8 text-foreground uppercase tracking-tighter italic">
          {isRegister ? t.register : t.login}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest ml-1">{t.title}</label>
              <input
                type="text"
                placeholder={t.title}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full brutalist-input"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full brutalist-input"
              required
            />
          </div>
          <div className="space-y-1 relative">
            <label className="text-xs font-black uppercase tracking-widest ml-1">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full brutalist-input pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 brutalist-button-primary text-xl uppercase font-black italic mt-4 disabled:opacity-50"
          >
            {loading ? '...' : isRegister ? t.register : t.login}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-6 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors text-center underline decoration-4 underline-offset-4"
        >
          {isRegister ? t.login : t.register}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
