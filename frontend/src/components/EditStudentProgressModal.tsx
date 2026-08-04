import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';

interface EditStudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  initialAttended: number;
  initialTotalLessons: number;
  initialCompletedTasks: number;
  initialTotalTasks: number;
  onSuccess: () => void;
}

export const EditStudentProgressModal: React.FC<EditStudentProgressModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  initialAttended = 0,
  initialTotalLessons = 10,
  initialCompletedTasks = 0,
  initialTotalTasks = 12,
  onSuccess,
}) => {
  const [attended, setAttended] = useState<number>(initialAttended);
  const [totalLessons, setTotalLessons] = useState<number>(initialTotalLessons || 10);
  const [completedTasks, setCompletedTasks] = useState<number>(initialCompletedTasks);
  const [totalTasks, setTotalTasks] = useState<number>(initialTotalTasks || 12);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const attendancePct = totalLessons > 0 ? Math.round((attended / totalLessons) * 100) : 0;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  // Weighted overall estimate: 40% attendance + 60% assignments
  const estimatedOverall = Math.round((attendancePct * 0.4) + (taskPct * 0.6));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    try {
      await api.put(`/students/${studentId}/progress`, {
        attended_lessons_count: Number(attended),
        total_lessons_count: Number(totalLessons),
        completed_tasks_count: Number(completedTasks),
        total_tasks_count: Number(totalTasks),
      });

      setToastMessage({ text: 'Student progress updated & scores recalculated successfully!', type: 'success' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update student progress:', err);
      setToastMessage({ text: err.response?.data?.detail || 'Failed to save changes. Please try again.', type: 'error' });
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
    >
      <div 
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '540px',
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
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38BDF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              DIRECT PROGRESS EDITING
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              {studentName}
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
        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

          {/* Real-time Calculation Preview Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '0.75rem',
              padding: '1rem',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Attendance</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#38BDF8' }}>{attendancePct}%</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{attended} / {totalLessons}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Tasks</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#A855F7' }}>{taskPct}%</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{completedTasks} / {totalTasks}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Overall Estimated</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: estimatedOverall >= 75 ? '#34D399' : estimatedOverall >= 50 ? '#FBBF24' : '#F87171' }}>
                {estimatedOverall}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Calculated Score</div>
            </div>
          </div>

          {/* Attendance Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8', marginBottom: '0.75rem' }}>
              📚 Lectures & Attendance
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Attended Lectures</label>
                <input
                  type="number"
                  min="0"
                  max={totalLessons}
                  value={attended}
                  onChange={(e) => setAttended(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Total Lectures</label>
                <input
                  type="number"
                  min="1"
                  value={totalLessons}
                  onChange={(e) => setTotalLessons(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#A855F7', marginBottom: '0.75rem' }}>
              📝 Assignments & Tasks
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Completed Tasks</label>
                <input
                  type="number"
                  min="0"
                  max={totalTasks}
                  value={completedTasks}
                  onChange={(e) => setCompletedTasks(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Total Tasks</label>
                <input
                  type="number"
                  min="1"
                  value={totalTasks}
                  onChange={(e) => setTotalTasks(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.375rem',
                background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
              }}
            >
              {saving ? 'Updating...' : 'Save & Calculate'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
