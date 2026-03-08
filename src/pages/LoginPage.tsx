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
          navigate('/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — Form */}
      <div className="w-full lg:w-1/2 bg-[hsl(225,30%,8%)] flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-28 relative">
        {/* Logo / Brand */}
        <div className="mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6">
            <span className="text-primary-foreground font-black text-lg">F</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-[hsl(220,10%,50%)] text-sm mt-2">
            {isRegister ? 'Preencha os dados para começar' : 'Entre com suas credenciais para continuar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[hsl(220,10%,55%)] mb-1.5 tracking-wide uppercase">
                Nome
              </label>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(225,25%,12%)] border border-[hsl(225,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[hsl(220,10%,55%)] mb-1.5 tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[hsl(225,25%,12%)] border border-[hsl(225,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[hsl(220,10%,55%)] mb-1.5 tracking-wide uppercase">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(225,25%,12%)] border border-[hsl(225,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,40%)] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[hsl(225,15%,18%)]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-[hsl(225,30%,8%)] font-semibold text-sm disabled:opacity-50 hover:bg-white/90 transition-all"
          >
            {loading ? '...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[hsl(220,10%,45%)] max-w-sm">
          {isRegister ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-white font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            {isRegister ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>

      {/* Right side — Gradient visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[hsl(225,30%,8%)]">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 40%, hsl(225, 100%, 55%) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 30% 70%, hsl(320, 80%, 50%) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 70% 80%, hsl(20, 90%, 55%) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 60% 30%, hsl(270, 70%, 45%) 0%, transparent 50%)
            `,
          }}
        />
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      </div>
    </div>
  );
};

export default LoginPage;
