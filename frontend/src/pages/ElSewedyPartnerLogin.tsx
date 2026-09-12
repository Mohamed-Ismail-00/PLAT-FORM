import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import partnerApi from '../services/partnerApi';
import { usePartnerAuth } from '../context/PartnerAuthContext';

const INNOVERA_WEBSITE_URL = 'https://www.innoveracorp.com/';

const ElSewedyPartnerLogin = () => {
  const { user, loading: authLoading, login } = usePartnerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && user) return <Navigate to="/partners/elswedy" replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await partnerApi.post('/partners/elswedy/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const payload = response.data?.data;
      if (!payload?.access_token || !payload?.user) throw new Error('Incomplete partner authentication response.');
      login(payload.access_token, payload.user, rememberMe);
      navigate('/partners/elswedy', { replace: true });
    } catch (submitError: any) {
      const isNetworkError = submitError?.code === 'ERR_NETWORK' || submitError?.message === 'Network Error';
      setError(isNetworkError
        ? 'Unable to connect to the partner workspace. Please refresh the local dashboard and try again.'
        : submitError.response?.data?.detail || submitError.message || 'Unable to sign in to the partner workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="partner-login-page">
      <section className="partner-login-brand-panel">
        <div className="partner-brand-lockup partner-brand-lockup-large">
          <div className="partner-university-logo-wrap"><img src="/assets/SWEDY.png" alt="SUTECH El Sewedy University" className="partner-university-logo" /></div>
          <div className="partner-brand-divider" />
          <img src="/assets/innovera_official_logo.png" alt="Innovera" className="partner-innovera-logo" />
        </div>
        <div className="partner-login-message">
          <span className="partner-eyebrow">Secure partner workspace</span>
          <h1>Innovera x El Sewedy University<br />Internship Program</h1>
          <p>Confidential performance intelligence for the Software Engineering and Artificial Intelligence tracks.</p>
          <div className="partner-login-trust"><ShieldCheck size={17} /> Isolated access · El Sewedy records only</div>
        </div>
        <a className="partner-login-footer partner-powered-by" href={INNOVERA_WEBSITE_URL} target="_blank" rel="noreferrer">Powered by Innovera</a>
      </section>

      <section className="partner-login-form-panel">
        <div className="partner-login-card">
          <div className="partner-form-icon"><Building2 size={22} /></div>
          <span className="partner-eyebrow">El Sewedy University</span>
          <h2>Partner sign in</h2>
          <p className="partner-form-subtitle">Use your organization credentials to access the private workspace.</p>

          {error && <div className="partner-alert" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="partner-auth-form">
            <label className="partner-field-label" htmlFor="partner-email">Work email</label>
            <div className="partner-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input id="partner-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@elswedy.edu.eg" required autoComplete="email" />
            </div>

            <label className="partner-field-label" htmlFor="partner-password">Password</label>
            <div className="partner-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input id="partner-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required minLength={8} autoComplete="current-password" />
              <button type="button" className="partner-input-action" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="partner-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Keep me signed in</label>
            <button className="partner-primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Authenticating…' : 'Enter partner workspace'} {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="partner-login-security"><ShieldCheck size={16} /> Your access is restricted to El Sewedy University data.</div>
        </div>
      </section>
    </main>
  );
};

export default ElSewedyPartnerLogin;
