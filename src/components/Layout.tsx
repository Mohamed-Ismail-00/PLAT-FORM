import React, { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
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
  const { user } = useAuth();
  
  if (!user) return null;

  const isStudent = user.roles.includes('student');
  const isInstructor = user.roles.includes('instructor');
  const isAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');

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

        <div className="sidebar-footer">
          <div className="user-profile-container">
            <div className="user-avatar">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="user-info">
              <p className="user-name">
                {user.first_name} {user.last_name}
              </p>
              <p className="user-role">
                {user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1)}
              </p>
            </div>
          </div>
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
  return (
    <header className="header">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={onOpenMobileMenu}>
          <Menu size={24} color="#0F172A" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
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
