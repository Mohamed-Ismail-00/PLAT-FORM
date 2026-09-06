import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { Mail, Phone, User, GraduationCap } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackName: string;
  courseId: string;
  batchName: 'BATCH 1' | 'BATCH 2';
  onSuccess: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  trackName,
  courseId,
  batchName,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setPersonalEmail('');
      setPhoneNumber('');
      setToastMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  // Simple email validation
  const isEmailValid = !personalEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail);

  // Phone validation (optional, allow digits, spaces, dashes, plus)
  const isPhoneValid = !phoneNumber || /^[+\d\s\-()]{7,20}$/.test(phoneNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (!isEmailValid || !isPhoneValid) return;

    setSaving(true);
    setToastMessage(null);

    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        course_id: courseId,
        batch_name: batchName,
      };
      if (personalEmail.trim()) {
        payload.personal_email = personalEmail.trim();
      }
      if (phoneNumber.trim()) {
        payload.phone = phoneNumber.trim();
      }

      const res = await api.post('/students/quick-add', payload);

      const data = res.data?.data;
      setToastMessage({
        text: `${data?.full_name || 'Student'} added to ${trackName} successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to add student:', err);
      setToastMessage({
        text: err.response?.data?.detail || 'Failed to add student. Please try again.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Common input styles
  const inputStyle = (hasError: boolean = false): React.CSSProperties => ({
    width: '100%',
    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
    borderRadius: '0.5rem',
    background: '#0F172A',
    border: `1px solid ${hasError ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
    color: '#FFF',
    outline: 'none',
    fontSize: '0.875rem',
    transition: 'border-color 0.2s',
  });

  const iconWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#1E293B',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#F8FAFC',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#A78BFA',
              }}
            >
              ADD NEW STUDENT
            </span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              {trackName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94A3B8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {toastMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${toastMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
                color: toastMessage.type === 'success' ? '#34D399' : '#FCA5A5',
              }}
            >
              {toastMessage.text}
            </div>
          )}

          {/* Track Info Badge */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={18} color="#FFF" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolling to Track</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8' }}>{trackName}</div>
              <div style={{ fontSize: '0.72rem', color: '#A78BFA', marginTop: '0.15rem', fontWeight: 700 }}>{batchName}</div>
            </div>
          </div>

          {/* Name Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.375rem' }}>
                First Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapperStyle}>
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Ahmed"
                  autoComplete="off"
                  autoFocus
                  style={inputStyle(!!firstName && firstName.trim().length < 2)}
                />
              </div>
              {firstName && firstName.trim().length < 2 && (
                <span style={{ fontSize: '0.7rem', color: '#F87171', marginTop: '0.25rem', display: 'block' }}>
                  Minimum 2 characters
                </span>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.375rem' }}>
                Last Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapperStyle}>
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Mohamed"
                  autoComplete="off"
                  style={inputStyle(!!lastName && lastName.trim().length < 2)}
                />
              </div>
              {lastName && lastName.trim().length < 2 && (
                <span style={{ fontSize: '0.7rem', color: '#F87171', marginTop: '0.25rem', display: 'block' }}>
                  Minimum 2 characters
                </span>
              )}
            </div>
          </div>

          {/* Personal Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.375rem' }}>
              Personal Email <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={iconWrapperStyle}>
                <Mail size={15} />
              </div>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="e.g. ahmed.mohamed@gmail.com"
                autoComplete="off"
                style={inputStyle(!isEmailValid)}
              />
            </div>
            {!isEmailValid && (
              <span style={{ fontSize: '0.7rem', color: '#F87171', marginTop: '0.25rem', display: 'block' }}>
                Please enter a valid email address
              </span>
            )}
          </div>

          {/* Phone Number Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.375rem' }}>
              Phone Number <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={iconWrapperStyle}>
                <Phone size={15} />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +20 1XX XXX XXXX"
                autoComplete="off"
                style={inputStyle(!isPhoneValid)}
              />
            </div>
            {!isPhoneValid && (
              <span style={{ fontSize: '0.7rem', color: '#F87171', marginTop: '0.25rem', display: 'block' }}>
                Please enter a valid phone number
              </span>
            )}
          </div>

          {/* Auto-generated info notice */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.625rem',
              background: 'rgba(251, 191, 36, 0.06)',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              fontSize: '0.78rem',
              color: '#FBBF24',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              System Credentials (Auto-Generated)
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Platform Login Email: </span>
                <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>
                  {firstName.trim() && lastName.trim()
                    ? `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@innovera-intern.com`
                    : 'firstname.lastname@innovera-intern.com'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Password: </span>
                <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>Innovera@2026</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.375rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isValid || !isEmailValid || !isPhoneValid}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.375rem',
                background: isValid && isEmailValid && isPhoneValid
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: saving || !isValid ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: isValid ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Adding...' : '+ Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
