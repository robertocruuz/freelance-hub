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

  const inputClass = "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen landing-hero-bg flex items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-sm bg-card rounded-3xl p-8 shadow-2xl animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isRegister ? t.register : t.login}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isRegister ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder={t.title}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass + " pr-12"}
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {loading ? '...' : isRegister ? t.register : t.login}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          {isRegister ? t.login : t.register}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
