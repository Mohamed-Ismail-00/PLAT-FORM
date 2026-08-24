import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { MessageSquare, Sparkles, Check, AlertCircle } from 'lucide-react';

interface EditStudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  initialAttended: number;
  initialTotalLessons: number;
  initialCompletedTasks: number;
  initialTotalTasks: number;
  initialFeedback?: string;
  onSuccess: (updatedInfo?: any) => void;
}

const QUICK_FEEDBACK_TEMPLATES = [
  { label: '🌟 Outstanding Performance', text: 'Outstanding commitment and high-quality task submissions. Consistently exceeds expectations.' },
  { label: '🚀 Fast Learner', text: 'Shows great analytical skills and grasp of complex concepts. Recommended for advanced projects.' },
  { label: '📈 Steady Progress', text: 'Good progress overall. Needs to focus on submitting upcoming assignments on time.' },
  { label: '💬 Needs More Practice', text: 'Regular attendance, but requires additional hands-on practice in practical tasks.' },
  { label: '⚠️ Follow-up Required', text: 'Noticeable drop in attendance/tasks. Academic follow-up recommended.' },
];

export const EditStudentProgressModal: React.FC<EditStudentProgressModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  initialAttended = 0,
  initialTotalLessons = 10,
  initialCompletedTasks = 0,
  initialTotalTasks = 12,
  initialFeedback = '',
  onSuccess,
}) => {
  const [attended, setAttended] = useState<number>(initialAttended);
  const [totalLessons, setTotalLessons] = useState<number>(initialTotalLessons || 10);
  const [completedTasks, setCompletedTasks] = useState<number>(initialCompletedTasks);
  const [totalTasks, setTotalTasks] = useState<number>(initialTotalTasks || 12);
  const [feedback, setFeedback] = useState<string>(initialFeedback || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync state when props change or when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAttended(initialAttended ?? 0);
      setTotalLessons(initialTotalLessons || 10);
      setCompletedTasks(initialCompletedTasks ?? 0);
      setTotalTasks(initialTotalTasks || 12);
      setFeedback(initialFeedback || '');
      setToastMessage(null);
    }
  }, [isOpen, studentId, initialAttended, initialTotalLessons, initialCompletedTasks, initialTotalTasks, initialFeedback]);

  if (!isOpen) return null;

  const attendancePct = totalLessons > 0 ? Math.round((attended / totalLessons) * 100) : 0;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  // Weighted overall estimate: 40% attendance + 60% assignments
  const estimatedOverall = Math.round((attendancePct * 0.4) + (taskPct * 0.6));

  const handleApplyTemplate = (templateText: string) => {
    if (!feedback.trim()) {
      setFeedback(templateText);
    } else if (!feedback.includes(templateText)) {
      setFeedback((prev) => `${prev}\n${templateText}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    const payload = {
      attended_lessons_count: attended,
      total_lessons_count: totalLessons,
      completed_tasks_count: completedTasks,
      total_tasks_count: totalTasks,
      feedback: feedback.trim(),
    };

    try {
      const response = await api.put(`/students/${studentId}/progress`, payload);
      setToastMessage({ text: '✅ Progress & feedback saved successfully!', type: 'success' });
      
      setTimeout(() => {
        onSuccess({
          studentId,
          attended_lessons_count: attended,
          total_lessons_count: totalLessons,
          completed_tasks_count: completedTasks,
          total_tasks_count: totalTasks,
          progress_percentage: estimatedOverall,
          feedback: feedback.trim(),
          scoring: response.data?.data?.scoring,
        });
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update student progress:', err);
      setToastMessage({
        text: err.response?.data?.detail || 'Failed to save progress. Please try again.',
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card)',
            zIndex: 10,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Edit Progress & Feedback
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Student: <span style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>{studentName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.25rem',
              borderRadius: '0.375rem',
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
              background: 'var(--bg-surface)',
              borderRadius: '0.75rem',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#38BDF8' }}>{attendancePct}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{attended} / {totalLessons}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#A855F7' }}>{taskPct}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{completedTasks} / {totalTasks}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Estimated</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: estimatedOverall >= 75 ? '#34D399' : estimatedOverall >= 50 ? '#FBBF24' : '#F87171' }}>
                {estimatedOverall}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calculated Score</div>
            </div>
          </div>

          {/* Attendance Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8', marginBottom: '0.75rem' }}>
              📚 Lectures & Attendance
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Attended Lectures</label>
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
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Lectures</label>
                <input
                  type="number"
                  min="1"
                  value={totalLessons}
                  onChange={(e) => setTotalLessons(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#A855F7', marginBottom: '0.75rem' }}>
              📝 Assignments & Tasks
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Completed Tasks</label>
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
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Tasks</label>
                <input
                  type="number"
                  min="1"
                  value={totalTasks}
                  onChange={(e) => setTotalTasks(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Feedback & Performance Notes Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary-color)' }}>
                <MessageSquare size={16} />
                <span>Instructor Feedback & Notes</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {feedback.length} / 500 characters
              </span>
            </div>

            {/* Quick Template Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {QUICK_FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.text)}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.375rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--secondary-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                  }}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Write detailed student performance feedback, key achievements, strengths, or areas for improvement..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '0.5rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.55rem 1.5rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {saving ? 'Saving...' : 'Save & Calculate'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
