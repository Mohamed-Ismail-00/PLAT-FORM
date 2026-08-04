import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackName: string;
  courseId: string;
  onSuccess: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  trackName,
  courseId,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setToastMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setToastMessage(null);

    try {
      const res = await api.post('/students/quick-add', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        course_id: courseId,
      });

      const data = res.data?.data;
      setToastMessage({
        text: `✅ ${data?.full_name || 'Student'} added to ${trackName} successfully!`,
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
          maxWidth: '480px',
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
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolling to Track</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8' }}>{trackName}</div>
            </div>
          </div>

          {/* Name Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.375rem' }}>
                First Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ahmed"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  background: '#0F172A',
                  border: `1px solid ${firstName && firstName.trim().length < 2 ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: '#FFF',
                  outline: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s',
                }}
              />
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
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Mohamed"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  background: '#0F172A',
                  border: `1px solid ${lastName && lastName.trim().length < 2 ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: '#FFF',
                  outline: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s',
                }}
              />
              {lastName && lastName.trim().length < 2 && (
                <span style={{ fontSize: '0.7rem', color: '#F87171', marginTop: '0.25rem', display: 'block' }}>
                  Minimum 2 characters
                </span>
              )}
            </div>
          </div>

          {/* Auto-generated info notice */}
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              fontSize: '0.75rem',
              color: '#FBBF24',
              lineHeight: 1.5,
            }}
          >
            💡 An email & password will be auto-generated. The student can log in with:
            <br />
            <span style={{ color: '#94A3B8' }}>Email:</span>{' '}
            <span style={{ fontFamily: 'monospace' }}>
              {firstName.trim() && lastName.trim()
                ? `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@innovera-intern.com`
                : 'firstname.lastname@innovera-intern.com'}
            </span>
            <br />
            <span style={{ color: '#94A3B8' }}>Password:</span> <span style={{ fontFamily: 'monospace' }}>Innovera@2026</span>
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
              disabled={saving || !isValid}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.375rem',
                background: isValid
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
              {saving ? '⏳ Adding...' : '+ Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
