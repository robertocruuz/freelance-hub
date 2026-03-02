import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

  const inputClass = "w-full brutalist-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 font-bold hover:translate-x-[-2px] transition-transform group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        VOLTAR
      </button>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md brutalist-card p-10 bg-white"
      >
        <div className="flex justify-center mb-8">
          <h1 className="text-4xl italic font-display">Logo*</h1>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-tight">
          {isRegister ? t.register : t.login}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">{t.title}</label>
              <input
                type="text"
                placeholder={t.title}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest">EMAIL</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + " pr-12"}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full brutalist-button-primary h-14 text-lg uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? '...' : isRegister ? 'Criar Conta' : 'Entrar'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-black/5 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium">
            {isRegister ? 'Já possui uma conta?' : 'Não tem uma conta?'}
          </p>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
          >
            {isRegister ? t.login : t.register}
          </button>
        </div>
      </motion.div>

      {/* Aesthetic elements */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-tr-full -z-10" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 rounded-bl-full -z-10" />
    </div>
  );
};

export default LoginPage;
