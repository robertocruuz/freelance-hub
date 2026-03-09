import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, FileText, Clock, FolderKanban, Receipt, ArrowRight, CheckCircle2, Star, Zap, Shield, TrendingUp, Play, ChevronRight, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import heroDashboard from '@/assets/hero-dashboard.jpg';
import featureClients from '@/assets/feature-clients.jpg';
import featureKanban from '@/assets/feature-kanban.jpg';
import featureTimetracking from '@/assets/feature-timetracking.jpg';
import featureBudgets from '@/assets/feature-budgets.jpg';
import featureInvoices from '@/assets/feature-invoices.jpg';
import featureVault from '@/assets/feature-vault.jpg';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isDark, toggle } = useTheme();

  const features = [
    {
      icon: Users,
      title: lang === 'pt-BR' ? 'Gestão de Clientes' : 'Client Management',
      desc: lang === 'pt-BR' 
        ? 'Centralize todas as informações dos seus clientes em um só lugar. Histórico completo, contatos e documentos organizados.' 
        : 'Centralize all your client information in one place. Complete history, organized contacts and documents.',
      image: '/placeholder.svg',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: FolderKanban,
      title: lang === 'pt-BR' ? 'Kanban & Projetos' : 'Kanban & Projects',
      desc: lang === 'pt-BR' 
        ? 'Organize seus projetos visualmente com quadros Kanban personalizáveis. Arraste, solte e acompanhe o progresso em tempo real.' 
        : 'Organize your projects visually with customizable Kanban boards. Drag, drop and track progress in real-time.',
      image: '/placeholder.svg',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      desc: lang === 'pt-BR' 
        ? 'Registre cada minuto do seu trabalho automaticamente. Relatórios detalhados para cobrar exatamente o que você trabalhou.' 
        : 'Track every minute of your work automatically. Detailed reports to bill exactly what you worked.',
      image: '/placeholder.svg',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: FileText,
      title: lang === 'pt-BR' ? 'Orçamentos Profissionais' : 'Professional Budgets',
      desc: lang === 'pt-BR' 
        ? 'Crie orçamentos impressionantes em minutos. Templates personalizáveis e envio direto para seus clientes.' 
        : 'Create stunning quotes in minutes. Customizable templates and direct sending to your clients.',
      image: '/placeholder.svg',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: Receipt,
      title: lang === 'pt-BR' ? 'Faturamento Automático' : 'Automatic Invoicing',
      desc: lang === 'pt-BR' 
        ? 'Transforme orçamentos aprovados em faturas com um clique. Controle de pagamentos e lembretes automáticos.' 
        : 'Turn approved quotes into invoices with one click. Payment tracking and automatic reminders.',
      image: '/placeholder.svg',
      color: 'from-pink-500 to-pink-600',
    },
    {
      icon: KeyRound,
      title: lang === 'pt-BR' ? 'Cofre de Senhas' : 'Password Vault',
      desc: lang === 'pt-BR' 
        ? 'Armazene credenciais de clientes com segurança total. Acesse de qualquer lugar com criptografia de ponta.' 
        : 'Store client credentials with total security. Access from anywhere with end-to-end encryption.',
      image: '/placeholder.svg',
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: lang === 'pt-BR' ? 'Economize 10h/semana' : 'Save 10h/week',
      desc: lang === 'pt-BR' ? 'Automatize tarefas repetitivas' : 'Automate repetitive tasks',
    },
    {
      icon: TrendingUp,
      title: lang === 'pt-BR' ? 'Aumente sua receita' : 'Increase your revenue',
      desc: lang === 'pt-BR' ? 'Nunca mais esqueça de cobrar' : 'Never forget to bill again',
    },
    {
      icon: Shield,
      title: lang === 'pt-BR' ? 'Dados seguros' : 'Secure data',
      desc: lang === 'pt-BR' ? 'Criptografia de ponta a ponta' : 'End-to-end encryption',
    },
  ];

  const testimonials = [
    {
      name: 'Maria Silva',
      role: lang === 'pt-BR' ? 'Designer Freelancer' : 'Freelance Designer',
      content: lang === 'pt-BR' 
        ? 'Desde que comecei a usar, minha organização melhorou 100%. Consigo entregar mais projetos e nunca mais perdi prazos!'
        : 'Since I started using it, my organization improved 100%. I can deliver more projects and never miss deadlines!',
      avatar: 'MS',
      rating: 5,
    },
    {
      name: 'João Santos',
      role: lang === 'pt-BR' ? 'Desenvolvedor Web' : 'Web Developer',
      content: lang === 'pt-BR'
        ? 'O time tracking me ajudou a entender quanto tempo levo em cada projeto. Agora consigo precificar muito melhor meus serviços.'
        : 'Time tracking helped me understand how long each project takes. Now I can price my services much better.',
      avatar: 'JS',
      rating: 5,
    },
    {
      name: 'Ana Costa',
      role: lang === 'pt-BR' ? 'Social Media Manager' : 'Social Media Manager',
      content: lang === 'pt-BR'
        ? 'Os orçamentos profissionais fizeram toda diferença. Meus clientes me veem de forma muito mais profissional agora.'
        : 'Professional quotes made all the difference. My clients see me much more professionally now.',
      avatar: 'AC',
      rating: 5,
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Logo<span className="text-primary">*</span>
          </h2>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: lang === 'pt-BR' ? 'Recursos' : 'Features', href: '#features' },
              { label: lang === 'pt-BR' ? 'Depoimentos' : 'Testimonials', href: '#testimonials' },
              { label: lang === 'pt-BR' ? 'Preços' : 'Pricing', href: '#pricing' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 transition text-foreground"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="h-9 px-3 rounded-full bg-muted hover:bg-muted/80 transition text-xs font-semibold text-foreground"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>
            <Button onClick={() => navigate('/login')} className="rounded-full px-6">
              {lang === 'pt-BR' ? 'Entrar' : 'Sign In'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              {lang === 'pt-BR' ? 'A plataforma #1 para freelancers' : 'The #1 platform for freelancers'}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight tracking-tight mb-6">
              {lang === 'pt-BR' ? (
                <>
                  Gerencie seu negócio
                  <br />
                  <span className="text-primary">freelancer</span> como um pro
                </>
              ) : (
                <>
                  Manage your freelance
                  <br />
                  business <span className="text-primary">like a pro</span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {lang === 'pt-BR'
                ? 'Clientes, projetos, orçamentos, faturas e controle de tempo — tudo em uma única plataforma intuitiva. Pare de perder tempo com planilhas e foque no que importa.'
                : 'Clients, projects, budgets, invoices and time tracking — all in one intuitive platform. Stop wasting time with spreadsheets and focus on what matters.'}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                onClick={() => navigate('/login')} 
                className="rounded-full px-8 h-14 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                {lang === 'pt-BR' ? 'Começar gratuitamente' : 'Start for free'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full px-8 h-14 text-base font-medium"
              >
                <Play className="w-5 h-5 mr-2" />
                {lang === 'pt-BR' ? 'Ver demonstração' : 'Watch demo'}
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'].map((color, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-xs font-bold`}>
                      {['M', 'J', 'A', 'R'][i]}
                    </div>
                  ))}
                </div>
                <span>{lang === 'pt-BR' ? '+2.500 freelancers ativos' : '+2,500 active freelancers'}</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Screenshot */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-border/50">
              <AspectRatio ratio={16 / 9}>
                <img 
                  src="/home.png" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
            {/* Floating badges */}
            <div className="absolute -left-4 top-1/4 glass rounded-xl p-4 shadow-lg hidden lg:flex items-center gap-3 animate-float">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{lang === 'pt-BR' ? 'Projeto entregue!' : 'Project delivered!'}</p>
                <p className="text-xs text-muted-foreground">{lang === 'pt-BR' ? 'Há 2 minutos' : '2 minutes ago'}</p>
              </div>
            </div>
            <div className="absolute -right-4 top-1/3 glass rounded-xl p-4 shadow-lg hidden lg:flex items-center gap-3 animate-float" style={{ animationDelay: '1s' }}>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">+R$ 4.500</p>
                <p className="text-xs text-muted-foreground">{lang === 'pt-BR' ? 'Este mês' : 'This month'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              {lang === 'pt-BR' ? 'Tudo que você precisa' : 'Everything you need'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {lang === 'pt-BR'
                ? 'Ferramentas poderosas integradas para você focar no que realmente importa: seus clientes.'
                : 'Powerful integrated tools so you can focus on what really matters: your clients.'}
            </p>
          </div>

          <div className="space-y-24">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-16 items-center`}
              >
                {/* Content */}
                <div className="flex-1 space-y-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                  <ul className="space-y-3">
                    {[
                      lang === 'pt-BR' ? 'Interface intuitiva e fácil de usar' : 'Intuitive and easy-to-use interface',
                      lang === 'pt-BR' ? 'Sincronização em tempo real' : 'Real-time synchronization',
                      lang === 'pt-BR' ? 'Acesso de qualquer dispositivo' : 'Access from any device',
                    ].map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" className="group">
                    {lang === 'pt-BR' ? 'Saiba mais' : 'Learn more'}
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Image */}
                <div className="flex-1 w-full">
                  <div className="glass rounded-2xl overflow-hidden shadow-xl border border-border/50">
                    <AspectRatio ratio={4 / 3}>
                      <div className={`w-full h-full bg-gradient-to-br ${feature.color} opacity-10`} />
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </AspectRatio>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              {lang === 'pt-BR' ? 'O que dizem nossos usuários' : 'What our users say'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {lang === 'pt-BR'
                ? 'Milhares de freelancers já transformaram sua forma de trabalhar.'
                : 'Thousands of freelancers have already transformed the way they work.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="glass border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              {lang === 'pt-BR' ? 'Planos simples e transparentes' : 'Simple and transparent plans'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {lang === 'pt-BR'
                ? 'Comece grátis e evolua conforme sua necessidade.'
                : 'Start free and upgrade as you need.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="glass border-border/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-foreground mb-2">{lang === 'pt-BR' ? 'Gratuito' : 'Free'}</h3>
                <p className="text-muted-foreground text-sm mb-6">{lang === 'pt-BR' ? 'Para começar' : 'To get started'}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-foreground">R$ 0</span>
                  <span className="text-muted-foreground">/{lang === 'pt-BR' ? 'mês' : 'month'}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    lang === 'pt-BR' ? 'Até 5 clientes' : 'Up to 5 clients',
                    lang === 'pt-BR' ? 'Projetos ilimitados' : 'Unlimited projects',
                    lang === 'pt-BR' ? 'Time tracking básico' : 'Basic time tracking',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full rounded-full" onClick={() => navigate('/login')}>
                  {lang === 'pt-BR' ? 'Começar grátis' : 'Start free'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary/50 shadow-xl shadow-primary/10 scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {lang === 'pt-BR' ? 'POPULAR' : 'POPULAR'}
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-foreground mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm mb-6">{lang === 'pt-BR' ? 'Para profissionais' : 'For professionals'}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-foreground">R$ 49</span>
                  <span className="text-muted-foreground">/{lang === 'pt-BR' ? 'mês' : 'month'}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    lang === 'pt-BR' ? 'Clientes ilimitados' : 'Unlimited clients',
                    lang === 'pt-BR' ? 'Orçamentos e faturas' : 'Budgets and invoices',
                    lang === 'pt-BR' ? 'Relatórios avançados' : 'Advanced reports',
                    lang === 'pt-BR' ? 'Cofre de senhas' : 'Password vault',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full rounded-full" onClick={() => navigate('/login')}>
                  {lang === 'pt-BR' ? 'Assinar Pro' : 'Subscribe Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Business Plan */}
            <Card className="glass border-border/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-foreground mb-2">Business</h3>
                <p className="text-muted-foreground text-sm mb-6">{lang === 'pt-BR' ? 'Para equipes' : 'For teams'}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-foreground">R$ 99</span>
                  <span className="text-muted-foreground">/{lang === 'pt-BR' ? 'mês' : 'month'}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    lang === 'pt-BR' ? 'Tudo do Pro' : 'Everything in Pro',
                    lang === 'pt-BR' ? 'Multi-usuários' : 'Multi-users',
                    lang === 'pt-BR' ? 'Suporte prioritário' : 'Priority support',
                    lang === 'pt-BR' ? 'API access' : 'API access',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full rounded-full" onClick={() => navigate('/login')}>
                  {lang === 'pt-BR' ? 'Falar com vendas' : 'Contact sales'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 landing-hero-bg">
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
            {lang === 'pt-BR' 
              ? 'Pronto para transformar seu negócio?' 
              : 'Ready to transform your business?'}
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            {lang === 'pt-BR'
              ? 'Junte-se a milhares de freelancers que já estão economizando tempo e ganhando mais.'
              : 'Join thousands of freelancers who are already saving time and earning more.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/login')} 
              className="rounded-full px-8 h-14 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {lang === 'pt-BR' ? 'Criar conta gratuita' : 'Create free account'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/50">
            {lang === 'pt-BR' 
              ? 'Sem cartão de crédito • Cancele quando quiser' 
              : 'No credit card required • Cancel anytime'}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-foreground">
                Logo<span className="text-primary">*</span>
              </h2>
              <span className="text-sm text-muted-foreground">
                © 2024. {lang === 'pt-BR' ? 'Todos os direitos reservados.' : 'All rights reserved.'}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition">{lang === 'pt-BR' ? 'Termos' : 'Terms'}</a>
              <a href="#" className="hover:text-foreground transition">{lang === 'pt-BR' ? 'Privacidade' : 'Privacy'}</a>
              <a href="#" className="hover:text-foreground transition">{lang === 'pt-BR' ? 'Contato' : 'Contact'}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
