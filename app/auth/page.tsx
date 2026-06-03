'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../context';

export default function Auth() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: sessionLoading } = useUser();

  useEffect(() => {
    if (!sessionLoading && user) router.replace('/');
  }, [user, sessionLoading, router]);

  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (tab === 'up') {
      const { error: err } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { display_name: username || email.split('@')[0] } },
      });
      if (err) {
        setError(
          err.message === 'User already registered'
            ? 'Este email ya está registrado.'
            : err.message
        );
      } else {
        setSuccess('Revisa tu correo para confirmar tu cuenta.');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (err) {
        setError('Credenciales incorrectas. Revisa tu email y contraseña.');
      } else {
        router.push('/');
      }
    }

    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleGuest = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (sessionLoading || user) return null;

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.16em',
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === 'in' ? 'on' : ''}
            onClick={() => {
              setTab('in');
              setError('');
              setSuccess('');
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === 'up' ? 'on' : ''}
            onClick={() => {
              setTab('up');
              setError('');
              setSuccess('');
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'up' && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--neon-magenta)',
                fontSize: 12,
                marginBottom: 8,
                letterSpacing: '0.05em',
              }}
            >
              ⚠ {error}
            </div>
          )}
          {success && (
            <div
              style={{
                color: 'var(--neon-cyan)',
                fontSize: 12,
                marginBottom: 8,
                letterSpacing: '0.05em',
              }}
            >
              ✓ {success}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading
              ? '...'
              : tab === 'in'
                ? 'ENTRAR AL VAULT'
                : 'CREAR Y JUGAR'}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: '100%', marginTop: 10 }}
          onClick={handleGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => handleOAuth('google')}
          >
            ◆&nbsp; GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => handleOAuth('github')}
          >
            ▣&nbsp; GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--ink-faint)',
            letterSpacing: '0.1em',
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
