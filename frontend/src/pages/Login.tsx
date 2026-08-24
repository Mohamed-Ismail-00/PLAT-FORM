import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LogIn, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  KeyRound,
  CheckCircle2
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to admin
  useEffect(() => {
    if (user) {
      if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
        navigate('/admin', { replace: true });
      } else if (user.roles?.includes('instructor')) {
        navigate('/instructor', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [user, navigate]);

  // Quick fill master credentials
  const fillCredentials = () => {
    setEmail('innovera@gmail.com');
    setPassword('innovera@2026');
    setError('');
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Try real API authentication first
      let authSuccess = false;
      try {
        const res = await api.post('/auth/login', { 
          email: cleanEmail, 
          password: cleanPassword 
        });
        if (res.data?.data?.access_token) {
          const { access_token, user: loggedUser } = res.data.data;
          login(access_token, loggedUser);
          authSuccess = true;
          navigate('/admin', { replace: true });
          return;
        }
      } catch (apiErr) {
        console.warn('API authentication error, checking universal credentials...', apiErr);
      }

      // 2. Master Universal Credentials fallback
      if (cleanEmail === 'innovera@gmail.com' && cleanPassword === 'innovera@2026') {
        const masterAdminUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'innovera@gmail.com',
          first_name: 'Innovera',
          last_name: 'Admin',
          roles: ['admin', 'super_admin']
        };
        const mockToken = 'innovera_master_token_' + Date.now();
        login(mockToken, masterAdminUser);
        navigate('/admin', { replace: true });
        return;
      }

      if (!authSuccess) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من إدخال البيانات بشكل سليم.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0F172A 50%, #030712 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '1.5rem',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      {/* Dynamic Background Glow Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, rgba(168, 85, 247, 0) 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Glassmorphism Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '1.5rem',
        padding: '2.75rem 2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)'
      }}>
        
        {/* Logo & Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          
          {/* Glowing Emblem Icon */}
          <div style={{
            position: 'relative',
            marginBottom: '1.25rem',
            padding: '0.85rem',
            borderRadius: '1.25rem',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(147, 51, 234, 0.25) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.35)'
          }}>
            <img 
              src="/assets/logo.png" 
              alt="Innovera" 
              style={{ height: '42px', width: 'auto', display: 'block', objectFit: 'contain' }}
              onError={(e) => {
                // fallback to text if image not found
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #FFFFFF 30%, #C7D2FE 70%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              INNOVERA
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#818CF8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              PRO PLATFORM
            </span>
          </div>

          <p style={{
            color: '#94A3B8',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
            fontWeight: 400
          }}>
            Student & Intern Performance Intelligence
          </p>
        </div>

        {/* Quick Fill One-Click Badge */}
        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '0.875rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <KeyRound size={18} color="#818CF8" />
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#E2E8F0', fontWeight: 600 }}>
                حساب الإدارة الموحد
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8' }}>
                innovera@gmail.com
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillCredentials}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: copiedBadge ? '#34D399' : '#818CF8',
              backgroundColor: copiedBadge ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: copiedBadge ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            {copiedBadge ? (
              <>
                <CheckCircle2 size={13} />
                <span>تم التعبئة</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>تعبئة تلقائية</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#FCA5A5',
            padding: '0.85rem 1rem',
            borderRadius: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Email Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#CBD5E1',
              marginBottom: '0.45rem'
            }}>
              البريد الإلكتروني (Email Address)
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="innovera@gmail.com"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '0.75rem',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#818CF8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label style={{
                fontSize: '0.82rem',
                fontWeight: 500,
                color: '#CBD5E1'
              }}>
                كلمة المرور (Password)
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '0.75rem',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#818CF8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#6366F1',
                  width: '15px',
                  height: '15px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>تذكر تسجيل دخولي</span>
            </label>
            <span style={{ fontSize: '0.8rem', color: '#818CF8', cursor: 'pointer' }} onClick={fillCredentials}>
              بيانات الدخول؟
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.75rem',
              padding: '0.95rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.45)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(79, 70, 229, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.45)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span>جاري الدخول...</span>
              </div>
            ) : (
              <>
                <LogIn size={20} />
                <span>تسجيل الدخول إلى المنصة</span>
              </>
            )}
          </button>
        </form>

        {/* Security / Encryption Notice */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          color: '#64748B',
          fontSize: '0.75rem'
        }}>
          <ShieldCheck size={14} color="#10B981" />
          <span>منصة محمية وموثقة &copy; {new Date().getFullYear()} Innovera Education</span>
        </div>

      </div>
    </div>
  );
};

export default Login;
