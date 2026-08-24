import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Settings, 
  LogOut, 
  User,
  Users,
  Activity,
  Menu,
  X
} from 'lucide-react';

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;

  const isStudent = user.roles.includes('student');
  const isInstructor = user.roles.includes('instructor');
  const isAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="mobile-backdrop"
          onClick={onClose}
        />
      )}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between" style={{ padding: '1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <img src="/assets/logo.png" alt="Innovera" style={{ height: '36px', objectFit: 'contain' }} />
          <button className="mobile-close-btn" onClick={onClose}>
            <X size={20} color="#94A3B8" />
          </button>
        </div>

        <div className="flex flex-col" style={{ padding: '1rem', flex: 1, gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
            Menu
          </p>
          
          {isStudent && (
            <>
              <NavItem to="/student" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={onClose} />
              <NavItem to="/student/courses" icon={<BookOpen size={20} />} label="My Courses" onClick={onClose} />
              <NavItem to="/student/schedule" icon={<Calendar size={20} />} label="Schedule" onClick={onClose} />
            </>
          )}
          
          {isInstructor && (
            <>
              <NavItem to="/instructor" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={onClose} />
              <NavItem to="/instructor/courses" icon={<BookOpen size={20} />} label="My Classes" onClick={onClose} />
              <NavItem to="/instructor/students" icon={<Users size={20} />} label="Students" onClick={onClose} />
            </>
          )}
          
          {isAdmin && (
            <>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem', marginBottom: '0.35rem', paddingLeft: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                Interns Program
              </p>
              <NavItem to="/admin" icon={<LayoutDashboard size={20} />} label="Overview" onClick={onClose} />
              <NavItem to="/admin/users" icon={<Users size={20} />} label="Intern Students" onClick={onClose} />

              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#A78BFA', marginTop: '1.25rem', marginBottom: '0.35rem', paddingLeft: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                Innovera Students
              </p>
              <NavItem to="/admin/students-overview" icon={<Activity size={20} />} label="Students Overview" onClick={onClose} />
              <NavItem to="/admin/students" icon={<BookOpen size={20} />} label="Course Students" onClick={onClose} />
            </>
          )}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
          <div className="user-profile-container" style={{ flex: 1, minWidth: 0 }}>
            <div className="user-avatar">
              {(user.first_name?.[0] || 'I')}{(user.last_name?.[0] || 'A')}
            </div>
            <div className="user-info" style={{ overflow: 'hidden' }}>
              <p className="user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
              </p>
              <p className="user-role">
                {(user.roles?.[0] || 'Admin').toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#F87171',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              marginLeft: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#F87171';
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink 
      to={to} 
      end={to === '/student' || to === '/instructor' || to === '/admin'}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: '0.5rem',
        textDecoration: 'none',
        color: isActive ? '#FFFFFF' : '#94A3B8',
        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        overflow: 'hidden'
      })}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      {icon}
      {label}
    </NavLink>
  );
};

const Header: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={onOpenMobileMenu}>
          <Menu size={24} color="#0F172A" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            مرحباً، {user?.first_name || 'Admin'}
          </span>
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', fontWeight: 600 }}>
            {user?.roles?.[0] || 'Admin'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#DC2626',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FCA5A5';
            e.currentTarget.style.color = '#991B1B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
          }}
        >
          <LogOut size={16} />
          <span>تسجيل خروج</span>
        </button>
      </div>
    </header>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <div className="flex h-screen items-center justify-center font-bold">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="layout-container">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="main-content">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<{ role: string, children: React.ReactNode }> = ({ role, children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  const hasRole = user.roles.includes(role) || user.roles.includes('super_admin');
  
  if (!hasRole) {
    if (user.roles.includes('instructor')) return <Navigate to="/instructor" replace />;
    if (user.roles.includes('admin')) return <Navigate to="/admin" replace />;
    return <Navigate to="/student" replace />;
  }
  
  return <>{children}</>;
};
