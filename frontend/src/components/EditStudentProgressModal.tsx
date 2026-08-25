import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Award, 
  Users, 
  MessageCircle, 
  Link as LinkIcon 
} from 'lucide-react';

export type TaskItem = {
  id?: string;
  title: string;
  submission_link?: string;
  communication_rating: number; // 1 to 5
  quality_rating: number; // 1 to 5
  teamwork_rating: number; // 1 to 5
  created_at?: string;
};

export interface ITaskItem {
  id?: string;
  title: string;
  submission_link?: string;
  communication_rating: number;
  quality_rating: number;
  teamwork_rating: number;
  created_at?: string;
}

interface EditStudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  initialAttended: number;
  initialTotalLessons: number;
  initialCompletedTasks: number;
  initialTotalTasks?: number;
  initialFeedback?: string;
  initialTasks?: TaskItem[];
  isIntern?: boolean;
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
  initialTotalTasks = 10,
  initialFeedback = '',
  initialTasks = [],
  isIntern = true,
  onSuccess,
}) => {
  const [attended, setAttended] = useState<number>(initialAttended);
  const [totalLessons, setTotalLessons] = useState<number>(initialTotalLessons || 10);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(initialCompletedTasks);
  const [totalTasks, setTotalTasks] = useState<number>(initialTotalTasks || 10);
  const [feedback, setFeedback] = useState<string>(initialFeedback || '');
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks || []);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New task form state
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLink, setNewLink] = useState<string>('');
  const [newComm, setNewComm] = useState<number>(5);
  const [newQuality, setNewQuality] = useState<number>(5);
  const [newTeam, setNewTeam] = useState<number>(5);

  // Sync state when props change or when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAttended(initialAttended ?? 0);
      setTotalLessons(initialTotalLessons || 10);
      setCompletedTasksCount(initialCompletedTasks ?? 0);
      setTotalTasks(initialTotalTasks || 10);
      setFeedback(initialFeedback || '');
      setTasks(Array.isArray(initialTasks) ? [...initialTasks] : []);
      setIsAddingTask(false);
      setToastMessage(null);
    }
  }, [isOpen, studentId, initialAttended, initialTotalLessons, initialCompletedTasks, initialTotalTasks, initialFeedback, initialTasks]);

  if (!isOpen) return null;

  const effectiveCompletedTasks = isIntern ? tasks.length : completedTasksCount;
  const attendancePct = totalLessons > 0 ? Math.round((attended / totalLessons) * 100) : 0;
  
  // Calculate average rating of tasks
  const avgTaskScore = tasks.length > 0
    ? (tasks.reduce((sum, t) => sum + ((t.communication_rating + t.quality_rating + t.teamwork_rating) / 3), 0) / tasks.length).toFixed(1)
    : '5.0';

  // For overall estimate: attendance (50%) + task performance (50%)
  const taskPerformancePct = Math.round((Number(avgTaskScore) / 5) * 100);
  const estimatedOverall = Math.round((attendancePct * 0.5) + (taskPerformancePct * 0.5));

  const handleApplyTemplate = (templateText: string) => {
    if (!feedback.trim()) {
      setFeedback(templateText);
    } else if (!feedback.includes(templateText)) {
      setFeedback((prev) => `${prev}\n${templateText}`);
    }
  };

  const handleCreateTask = () => {
    if (!newTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      submission_link: newLink.trim() || undefined,
      communication_rating: newComm,
      quality_rating: newQuality,
      teamwork_rating: newTeam,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTitle('');
    setNewLink('');
    setNewComm(5);
    setNewQuality(5);
    setNewTeam(5);
    setIsAddingTask(false);
  };

  const handleDeleteTask = (indexToDelete: number) => {
    setTasks((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    const payload = {
      attended_lessons_count: attended,
      total_lessons_count: totalLessons,
      completed_tasks_count: isIntern ? tasks.length : completedTasksCount,
      total_tasks_count: isIntern ? Math.max(tasks.length, 1) : totalTasks,
      feedback: feedback.trim(),
      tasks: isIntern ? tasks : undefined,
    };

    try {
      const response = await api.put(`/students/${studentId}/progress`, payload);
      setToastMessage({ text: '✅ Progress, tasks & feedback saved successfully!', type: 'success' });
      
      setTimeout(() => {
        onSuccess({
          studentId,
          attended_lessons_count: attended,
          total_lessons_count: totalLessons,
          completed_tasks_count: isIntern ? tasks.length : completedTasksCount,
          total_tasks_count: isIntern ? Math.max(tasks.length, 1) : totalTasks,
          progress_percentage: estimatedOverall,
          feedback: feedback.trim(),
          tasks: isIntern ? tasks : undefined,
          scoring: response.data?.data?.scoring,
        });
        onClose();
      }, 600);
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '94vh',
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
              Edit Progress, Tasks & Feedback
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

          {/* Real-time Summary Preview Card */}
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
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{attended} / {totalLessons} Days Attended</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks Done</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#A855F7' }}>
                {effectiveCompletedTasks} {effectiveCompletedTasks === 1 ? 'Task' : 'Tasks'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {isIntern ? `Avg: ${avgTaskScore} / 5.0 ⭐` : `${effectiveCompletedTasks} Completed`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Score</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: estimatedOverall >= 75 ? '#34D399' : estimatedOverall >= 50 ? '#FBBF24' : '#F87171' }}>
                {estimatedOverall}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall Performance</div>
            </div>
          </div>

          {/* 1. Attendance Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8', marginBottom: '0.75rem' }}>
              📅 Days Attended
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Days Attended</label>
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
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Days</label>
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

          {/* 2. Tasks Management Section */}
          {isIntern ? (
            /* DETAILED INTERN TASKS MANAGEMENT WITH 3 CRITERIA RATINGS & SUBMISSION LINK - UNLIMITED */
            <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 700, color: '#A855F7' }}>
                    <CheckCircle2 size={18} />
                    <span>Intern Tasks & Deliverables ({tasks.length} Completed)</span>
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Add submitted tasks, deliverable links, and evaluate across Communication, Quality & Teamwork.
                  </p>
                </div>
                {!isAddingTask && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Task</span>
                  </button>
                )}
              </div>

              {/* Inline Add Task Form */}
              {isAddingTask && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A855F7' }}>
                      ✨ Add New Task Deliverable
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      &times;
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Task Name / Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Task 1: Responsive Dashboard UI"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      <LinkIcon size={12} />
                      <span>Submission Link (GitHub / Figma / Drive)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/username/project"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* 3 Criteria Ratings (Communication, Task Quality, Teamwork) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <CriteriaRating
                      label="Communication"
                      icon={<MessageCircle size={13} />}
                      value={newComm}
                      onChange={setNewComm}
                    />
                    <CriteriaRating
                      label="Task Quality"
                      icon={<Award size={13} />}
                      value={newQuality}
                      onChange={setNewQuality}
                    />
                    <CriteriaRating
                      label="Teamwork"
                      icon={<Users size={13} />}
                      value={newTeam}
                      onChange={setNewTeam}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '0.375rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateTask}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '0.375rem',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      Confirm Task
                    </button>
                  </div>
                </div>
              )}

              {/* List of Existing Tasks */}
              {tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {tasks.map((task, idx) => {
                    const avgRating = ((task.communication_rating + task.quality_rating + task.teamwork_rating) / 3).toFixed(1);
                    return (
                      <div
                        key={task.id || idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                              {task.title}
                            </span>
                            {task.submission_link && (
                              <a
                                href={task.submission_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--secondary-color)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  textDecoration: 'none',
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                }}
                              >
                                <span>Link</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>

                          {/* 3 Criteria Evaluation Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              🗣️ Comm: <b style={{ color: 'var(--text-main)' }}>{task.communication_rating}★</b>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              🎯 Quality: <b style={{ color: 'var(--text-main)' }}>{task.quality_rating}★</b>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              🤝 Team: <b style={{ color: 'var(--text-main)' }}>{task.teamwork_rating}★</b>
                            </span>
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              color: Number(avgRating) >= 4 ? '#10B981' : '#F59E0B',
                              marginLeft: 'auto'
                            }}>
                              Score: {avgRating} / 5.0
                            </span>
                          </div>
                        </div>

                        {/* Delete Task Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(idx)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                            borderRadius: '0.375rem',
                            padding: '0.35rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          title="Remove task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !isAddingTask && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No deliverables logged yet. Click <b>"Add Task"</b> above to record tasks.
                  </div>
                )
              )}
            </div>
          ) : (
            /* STANDARD TASKS COUNTER (For Non-Interns Courses) */
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
                    value={completedTasksCount}
                    onChange={(e) => setCompletedTasksCount(Math.max(0, parseInt(e.target.value) || 0))}
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
          )}

          {/* 3. Feedback & Performance Notes Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary-color)' }}>
                <MessageSquare size={16} />
                <span>Intern Lead Feedback & Notes</span>
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

/* Criteria Rating Component for Communication, Task Quality, Teamwork */
const CriteriaRating: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, icon, value, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {icon} <span>{label}</span>
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary-color)' }}>
          {value}★
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              flex: 1,
              padding: '0.25rem 0',
              borderRadius: '0.25rem',
              border: star <= value ? '1px solid var(--secondary-color)' : '1px solid var(--border-color)',
              background: star <= value ? 'rgba(99, 102, 241, 0.2)' : 'var(--input-bg)',
              color: star <= value ? 'var(--secondary-color)' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {star}
          </button>
        ))}
      </div>
    </div>
  );
};
