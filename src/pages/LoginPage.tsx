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

  const inputClass = "w-full px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 focus:outline-none dark:border-white dark:bg-black dark:text-white dark:placeholder:text-white/40";

  return (
    <div className="min-h-screen bg-[#e9e8e0] dark:bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md brand-card p-10 animate-fade-in bg-white dark:bg-black">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-center mb-8">
          {isRegister ? t.register : t.login}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-brand-blue dark:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-brand bg-brand-neon text-xl uppercase font-black italic h-14 disabled:opacity-50"
          >
            {loading ? '...' : isRegister ? t.register : t.login}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-6 text-sm font-black uppercase underline decoration-2 underline-offset-4 hover:text-brand-blue transition-colors text-center"
        >
          {isRegister ? t.login : t.register}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
