import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  X,
  Sun,
  Moon
} from 'lucide-react';

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;

  const isStudent = user.roles?.includes('student');
  const isInstructor = user.roles?.includes('instructor');
  const isAdmin = user.roles?.includes('admin') || user.roles?.includes('super_admin');

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
        <div className="flex items-center justify-between" style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
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
            title="Sign Out"
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
        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={onOpenMobileMenu}>
          <Menu size={24} color="var(--text-main)" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Welcome, {user?.first_name || 'Admin'}
          </span>
          <span className="user-badge">
            {user?.roles?.[0] || 'Admin'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {theme === 'dark' ? (
            <Sun size={18} color="#FBBF24" style={{ animation: 'fadeIn 0.2s ease' }} />
          ) : (
            <Moon size={18} color="#6366F1" style={{ animation: 'fadeIn 0.2s ease' }} />
          )}
        </button>

        {/* Sign Out Button */}
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
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#EF4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#DC2626';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <div className="flex h-screen items-center justify-center font-bold" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>Loading...</div>;
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
  
  const hasRole = user.roles?.includes(role) || user.roles?.includes('super_admin');
  
  if (!hasRole) {
    if (user.roles?.includes('instructor')) return <Navigate to="/instructor" replace />;
    if (user.roles?.includes('admin')) return <Navigate to="/admin" replace />;
    return <Navigate to="/student" replace />;
  }
  
  return <>{children}</>;
};
