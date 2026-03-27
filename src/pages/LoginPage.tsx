import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
  
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  // Slider State
  const tips = [
    {
      tags: ["Dashboard Interativo", "Visão 360º"],
      quote: "Centralize todas as métricas, clientes e finanças em uma interface premium e clara.",
      author: "Freelance Hub",
      role: "Plataforma Executiva"
    },
    {
      tags: ["Kanban Dinâmico", "Produtividade"],
      quote: "Eu consegui reduzir o tempo perdido na gestão arrastando e soltando tarefas no painel visual.",
      author: "Módulo de Tarefas",
      role: "Workflow Otimizado"
    },
    {
      tags: ["Faturamento", "Automação"],
      quote: "Gere orçamentos em PDF com um clique e os converta automaticamente em novos projetos.",
      author: "Módulo Financeiro",
      role: "Emissão de Orçamentos"
    }
  ];
  const [currentTip, setCurrentTip] = useState(0);

  const nextTip = () => setCurrentTip((prev) => (prev + 1) % tips.length);
  const prevTip = () => setCurrentTip((prev) => (prev - 1 + tips.length) % tips.length);

  // Auto-play the slider
  useEffect(() => {
    const timer = setInterval(() => {
      nextTip();
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        }
      } else if (isRegister) {
        if (!isPasswordValid) {
          toast.error('A senha não atende aos requisitos mínimos.');
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
        } else {
          const { error: loginError } = await signIn(email, password);
          if (loginError) {
            toast.success('Conta criada! Faça login para continuar.');
          } else {
            toast.success('Conta criada com sucesso!');
            navigate('/dashboard');
          }
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

  const getTitle = () => {
    if (isForgotPassword) return 'Recuperar senha';
    if (isRegister) return 'Crie sua conta';
    return 'Bem-vindo de volta';
  };

  const getSubtitle = () => {
    if (isForgotPassword) return 'Informe seu email para receber o link de recuperação';
    if (isRegister) return 'Preencha os dados para começar';
    return 'Entre com suas credenciais para continuar';
  };

  return (
    <div className="min-h-screen flex lg:flex-row-reverse bg-background">
      {/* Right side (Visually) — Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-32 relative bg-background">
        <button
          onClick={() => isForgotPassword ? setIsForgotPassword(false) : isRegister ? setIsRegister(false) : navigate('/')}
          className="absolute top-6 left-6 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getTitle()}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {getSubtitle()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          {isRegister && !isForgotPassword && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">Nome</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/50 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/50 transition-all"
              required
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/50 transition-all pr-12"
                  required
                  minLength={isRegister ? 8 : 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isRegister && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${hasMinLength ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {hasMinLength ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>Mínimo de 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${hasUpperCase ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {hasUpperCase ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>Pelo menos 1 letra maiúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${hasLowerCase ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {hasLowerCase ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>Pelo menos 1 letra minúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${hasNumber ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {hasNumber ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>Pelo menos 1 número</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${hasSpecialChar ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {hasSpecialChar ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>Pelo menos 1 caractere especial</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isRegister && !isForgotPassword && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (isRegister && !isPasswordValid)}
              className="w-full py-3 rounded-[0.85rem] bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all"
            >
              {loading ? '...' : isForgotPassword ? 'Enviar link' : isRegister ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </form>

        {/* Separador */}
        <div className="relative mt-8 mb-6 max-w-sm">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 font-medium tracking-wide text-muted-foreground/70">Ou continue com</span>
          </div>
        </div>

        {/* Botão do Google */}
        <div className="max-w-sm mb-6">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await signInWithGoogle();
                if (error) toast.error(error.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-3 rounded-[0.85rem] bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="w-[1.125rem] h-[1.125rem] flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Entrar com o Google
          </button>
        </div>

        {!isForgotPassword && (
          <p className="mt-6 text-sm text-muted-foreground max-w-sm">
            {isRegister ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        )}
      </div>

      {/* Card Slider Section (Visually on Left side) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] p-4 lg:p-4 shrink-0">
        {/* The Boxed Gradient Container */}
        <div className="w-full h-full relative rounded-3xl overflow-hidden flex flex-col justify-end shadow-2xl">
        
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fluidGradient {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            .animate-fluid-background {
              background: linear-gradient(-45deg, hsl(var(--primary)), #6366f1, #a855f7, #ec4899);
              background-size: 400% 400%;
              animation: fluidGradient 15s ease infinite;
            }
            
            .glass-slider-enter { animation: sliderFadeIn 0.5s ease-out forwards; }
            @keyframes sliderFadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
          
          {/* Animated Fluid Background */}
          <div className="absolute inset-0 animate-fluid-background" />

          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

          {/* Tips Slider Overlay (Foreground) */}
          <div className="relative z-20 w-full p-10 md:p-14 mt-auto">
            <div key={currentTip} className="glass-slider-enter text-white">
              
              <div className="flex flex-wrap gap-3 mb-8">
                {tips[currentTip].tags.map((tag, i) => (
                  <span key={i} className="px-5 py-2 rounded-full border border-white/20 text-[13px] font-medium bg-black/20 tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-3xl md:text-[2.2rem] font-medium leading-[1.3] tracking-tight mb-12 drop-shadow-lg">
                {tips[currentTip].quote}
              </p>

              <div className="mb-2">
                <h4 className="font-bold text-lg mb-0.5">{tips[currentTip].author}</h4>
                <p className="text-white/80 text-sm font-medium">{tips[currentTip].role}</p>
              </div>
            </div>
          </div>
        
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
