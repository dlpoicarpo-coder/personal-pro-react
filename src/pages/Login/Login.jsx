import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupCref, setSignupCref] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate('/');
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    if (signupPassword.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); setLoading(false); return; }
    const result = await signUp(signupEmail, signupPassword, signupName, signupCref);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.needsConfirmation) {
      setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      setTab('login');
    } else {
      navigate('/');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">⚡</div>
          <h1 className="login-brand-name">Personal PRO</h1>
          <p className="login-brand-sub">Sistema de Treinamento</p>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          >
            Entrar
          </button>
          <button
            className={`login-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
          >
            Nova Conta
          </button>
        </div>

        {/* Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Signup Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="login-form">
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Seu nome"
                value={signupName}
                onChange={e => setSignupName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">CREF (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="000000-X/XX"
                value={signupCref}
                onChange={e => setSignupCref(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail *</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
