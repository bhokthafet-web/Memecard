import { useState } from 'react';
import './AuthPanel.css';

// Shown in the header. Renders nothing when Supabase isn't configured, so the
// app stays a plain local-only experience until someone opts into the cloud.
export function AuthPanel({ auth }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!auth.enabled || auth.loading) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setStatus('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await auth.signUp(email, password);
        if (signUpError) throw signUpError;
        setStatus('Account created. Check your email to confirm, then sign in.');
      } else {
        const { error: signInError } = await auth.signIn(email, password);
        if (signInError) throw signInError;
        setIsOpen(false);
        reset();
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (auth.user) {
    return (
      <div className="auth-panel">
        <span className="auth-panel-who">
          {auth.profile?.email || auth.user.email}
          {auth.isAdmin && <span className="auth-panel-badge">admin</span>}
        </span>
        <button type="button" className="auth-panel-signout pop-btn" onClick={() => auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <button
        type="button"
        className="auth-panel-signin pop-btn"
        onClick={() => {
          reset();
          setIsOpen(true);
        }}
      >
        Sign in
      </button>

      {isOpen && (
        <div className="auth-overlay" role="dialog" aria-modal="true">
          <form className="auth-form" onSubmit={handleSubmit}>
            <button
              type="button"
              className="auth-form-close pop-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === 'signin' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setStatus('');
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setStatus('');
                }}
              >
                Create account
              </button>
            </div>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}
            {status && <p className="auth-status">{status}</p>}

            <button type="submit" className="auth-submit pop-btn" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
