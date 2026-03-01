import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
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
    <div className="min-h-screen bg-brand-offwhite dark:bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md clean-card p-10 animate-fade-in bg-white shadow-2xl">
        <div className="text-center mb-10">
           <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-blue/20">
              <span className="text-white font-black text-2xl italic">F</span>
           </div>
           <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">
             {isRegister ? t.register : t.login}
           </h2>
           <p className="text-slate-500 font-medium mt-2">Enter your credentials to access your hub.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 ml-1">{t.title}</label>
               <div className="relative group">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
                 <input
                   type="text"
                   placeholder="Your Name"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all"
                 />
               </div>
            </div>
          )}

          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
             <div className="relative group">
               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
               <input
                 type="email"
                 placeholder="name@email.com"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all"
                 required
               />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700 ml-1">{t.password}</label>
             <div className="relative group">
               <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
               <input
                 type={showPassword ? 'text' : 'password'}
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-12 pr-12 py-3 rounded-2xl bg-slate-50 border-none outline-none font-semibold focus:ring-2 focus:ring-brand-blue/20 transition-all"
                 required
                 minLength={6}
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors"
               >
                 {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
             </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-14 text-lg font-bold shadow-lg shadow-brand-blue/20 disabled:opacity-50 mt-4"
          >
            {loading ? '...' : isRegister ? t.register : t.login}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-500 text-sm font-medium">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="ml-2 font-bold text-brand-blue hover:underline"
            >
              {isRegister ? t.login : t.register}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
