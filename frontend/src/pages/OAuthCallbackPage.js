import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OAuthCallbackPage() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { login }    = useAuth();
  const { toast }    = useToast();

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    const raw = params.get('data');
    if (!raw) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(decodeURIComponent(raw));
      login(userData);
      toast.success(`Welcome, ${userData.name}!`);

      if (userData.role === 'admin')          navigate('/admin');
      else if (userData.role === 'responder') navigate('/responder');
      else                                    navigate('/dashboard');
    } catch {
      toast.error('Sign-in error. Please try again.');
      navigate('/login');
    }
  }, []);

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#0a0a0a',
    }}>
      <div style={{ textAlign:'center', color:'#666', fontSize:'0.9rem' }}>
        <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🔥</div>
        Signing you in…
      </div>
    </div>
  );
}