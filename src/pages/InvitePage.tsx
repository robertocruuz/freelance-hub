import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Check, X, Loader2 } from 'lucide-react';

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { acceptInvite } = useOrganization();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const isPt = lang === 'pt-BR';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    setStatus('ready');
  }, [user, authLoading, token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');
    const { error } = await acceptInvite(token);
    if (error) {
      setErrorMsg(typeof error === 'string' ? error : 'Error');
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>{isPt ? 'Convite de Organização' : 'Organization Invite'}</CardTitle>
          <CardDescription>
            {isPt ? 'Você foi convidado para participar de uma organização' : 'You have been invited to join an organization'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
          {status === 'ready' && (
            <div className="flex gap-3 w-full">
              <Button className="flex-1 gap-1.5" onClick={handleAccept}>
                <Check className="w-4 h-4" />
                {isPt ? 'Aceitar convite' : 'Accept invite'}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => navigate('/dashboard')}>
                <X className="w-4 h-4" />
                {isPt ? 'Recusar' : 'Decline'}
              </Button>
            </div>
          )}
          {status === 'success' && (
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">
                {isPt ? 'Convite aceito! Redirecionando...' : 'Invite accepted! Redirecting...'}
              </p>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive">{errorMsg || (isPt ? 'Convite inválido ou expirado' : 'Invalid or expired invite')}</p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {isPt ? 'Ir para o dashboard' : 'Go to dashboard'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;
