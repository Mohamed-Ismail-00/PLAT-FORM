import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user } = res.data.data;
      login(access_token, user);
      
      if (user.roles.includes('super_admin') || user.roles.includes('admin')) {
        navigate('/admin');
      } else if (user.roles.includes('instructor')) {
        navigate('/instructor');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="card w-full max-w-md animate-fade-in" style={{ padding: '2.5rem 2rem' }}>
        <div className="flex flex-col items-center justify-center" style={{ marginBottom: '2.5rem' }}>
          <img src="/assets/logo_transparent.png" alt="Innovera Logo" style={{ height: '50px', marginBottom: '1.5rem' }} />
          <h1 style={{ color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 600, textAlign: 'center' }}>
            Student Performance Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Sign in to access your digital twin
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: 'var(--error)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', borderLeft: '4px solid var(--error)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@innovera.com"
              style={{ padding: '0.75rem' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{ padding: '0.75rem' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            style={{ marginTop: '1rem', padding: '0.875rem', fontSize: '1rem', borderRadius: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : (
              <div className="flex items-center justify-center gap-2">
                <LogIn size={18} />
                <span>Sign In</span>
              </div>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          &copy; {new Date().getFullYear()} Innovera. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
