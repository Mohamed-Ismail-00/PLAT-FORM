import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Award, 
  Users, 
  MessageCircle, 
  Link as LinkIcon, 
  ExternalLink,
  User,
  Phone,
  Mail,
  Calendar,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { averageTaskRating, normalizeTaskRatings, TASK_RATING_MAX } from '../utils/taskRatings';

export type TaskItem = {
  id?: string;
  title: string;
  submission_link?: string;
  note?: string;
  rating_scale?: number;
  communication_rating: number; // 0 to 10
  quality_rating: number; // 0 to 10
  teamwork_rating: number; // 0 to 10
  created_at?: string;
};

export interface ITaskItem {
  id?: string;
  title: string;
  submission_link?: string;
  note?: string;
  rating_scale?: number;
  communication_rating: number;
  quality_rating: number;
  teamwork_rating: number;
  created_at?: string;
}

interface EditStudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  enrollmentId?: string;
  studentName: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
  initialPersonalEmail?: string;
  initialAttended: number;
  initialTotalLessons: number;
  initialCompletedTasks: number;
  initialTotalTasks?: number;
  initialFeedback?: string;
  initialTasks?: TaskItem[];
  initialBatch?: 'BATCH 1' | 'BATCH 2';
  isIntern?: boolean;
  onSuccess: (updatedInfo?: any) => void;
}

const QUICK_FEEDBACK_TEMPLATES = [
  { label: 'Outstanding Performance', text: 'Outstanding commitment and high-quality task submissions. Consistently exceeds expectations.' },
  { label: 'Fast Learner', text: 'Shows great analytical skills and grasp of complex concepts. Recommended for advanced projects.' },
  { label: 'Steady Progress', text: 'Good progress overall. Needs to focus on submitting upcoming assignments on time.' },
  { label: 'Needs More Practice', text: 'Regular attendance, but requires additional hands-on practice in practical tasks.' },
  { label: 'Follow-up Required', text: 'Noticeable drop in attendance/tasks. Academic follow-up recommended.' },
];

export const EditStudentProgressModal: React.FC<EditStudentProgressModalProps> = ({
  isOpen,
  onClose,
  studentId,
  enrollmentId,
  studentName,
  initialFirstName = '',
  initialLastName = '',
  initialPhone = '',
  initialPersonalEmail = '',
  initialAttended = 0,
  initialTotalLessons = 10,
  initialCompletedTasks = 0,
  initialTotalTasks = 10,
  initialFeedback = '',
  initialTasks = [],
  initialBatch = 'BATCH 1',
  isIntern = true,
  onSuccess,
}) => {
  // Parse name into first and last if not provided explicitly
  const defaultFirst = initialFirstName || (studentName.split(' ')[0] || '');
  const defaultLast = initialLastName || (studentName.split(' ').slice(1).join(' ') || '');

  // Student personal info state
  const [firstName, setFirstName] = useState<string>(defaultFirst);
  const [lastName, setLastName] = useState<string>(defaultLast);
  const [phone, setPhone] = useState<string>(initialPhone || '');
  const [personalEmail, setPersonalEmail] = useState<string>(initialPersonalEmail || '');

  // Progress state
  const [attended, setAttended] = useState<number>(initialAttended);
  const [totalLessons, setTotalLessons] = useState<number>(initialTotalLessons || 10);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(initialCompletedTasks);
  const [totalTasks, setTotalTasks] = useState<number>(initialTotalTasks || 10);
  const [feedback, setFeedback] = useState<string>(initialFeedback || '');
  const [batchName, setBatchName] = useState<'BATCH 1' | 'BATCH 2'>(initialBatch);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks || []);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New task form state
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLink, setNewLink] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [newComm, setNewComm] = useState<number>(0);
  const [newQuality, setNewQuality] = useState<number>(0);
  const [newTeam, setNewTeam] = useState<number>(0);

  // Editing existing task state (index of the task being edited)
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editLink, setEditLink] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editComm, setEditComm] = useState<number>(0);
  const [editQuality, setEditQuality] = useState<number>(0);
  const [editTeam, setEditTeam] = useState<number>(0);

  // Sync state when props change or when modal opens
  useEffect(() => {
    if (isOpen) {
      const fName = initialFirstName || (studentName.split(' ')[0] || '');
      const lName = initialLastName || (studentName.split(' ').slice(1).join(' ') || '');
      setFirstName(fName);
      setLastName(lName);
      setPhone(initialPhone || '');
      setPersonalEmail(initialPersonalEmail || '');
      setAttended(initialAttended ?? 0);
      setTotalLessons(initialTotalLessons || 10);
      setCompletedTasksCount(initialCompletedTasks ?? 0);
      setTotalTasks(initialTotalTasks || 10);
      setFeedback(initialFeedback || '');
      setBatchName(initialBatch || 'BATCH 1');
      setTasks(Array.isArray(initialTasks) ? initialTasks.map(normalizeTaskRatings) : []);
      setIsAddingTask(false);
      setEditingTaskIndex(null);
      setToastMessage(null);
    }
  }, [isOpen, studentId, studentName, initialFirstName, initialLastName, initialPhone, initialPersonalEmail, initialAttended, initialTotalLessons, initialCompletedTasks, initialTotalTasks, initialFeedback, initialTasks, initialBatch]);

  if (!isOpen) return null;

  const attendancePct = totalLessons > 0 ? Math.round((attended / totalLessons) * 100) : 0;
  
  // Calculate average rating of tasks
  const avgTaskScore = tasks.length > 0
    ? (tasks.reduce((sum, task) => sum + averageTaskRating(task), 0) / tasks.length).toFixed(1)
    : '0.0';

  // For overall estimate: attendance (50%) + task performance (50%)
  const taskPerformancePct = tasks.length > 0 ? Math.round((Number(avgTaskScore) / TASK_RATING_MAX) * 100) : 0;
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
      note: newNote.trim() || undefined,
      rating_scale: TASK_RATING_MAX,
      communication_rating: newComm,
      quality_rating: newQuality,
      teamwork_rating: newTeam,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTitle('');
    setNewLink('');
    setNewNote('');
    setNewComm(0);
    setNewQuality(0);
    setNewTeam(0);
    setIsAddingTask(false);
  };

  const handleStartEditTask = (index: number) => {
    const task = tasks[index];
    if (!task) return;
    setEditingTaskIndex(index);
    setEditTitle(task.title || '');
    setEditLink(task.submission_link || '');
    setEditNote(task.note || '');
    setEditComm(task.communication_rating ?? 0);
    setEditQuality(task.quality_rating ?? 0);
    setEditTeam(task.teamwork_rating ?? 0);
  };

  const handleSaveEditTask = () => {
    if (editingTaskIndex === null) return;
    if (!editTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    setTasks((prev) => {
      const updated = [...prev];
      updated[editingTaskIndex] = {
        ...updated[editingTaskIndex],
        title: editTitle.trim(),
        submission_link: editLink.trim() || undefined,
        note: editNote.trim() || undefined,
        rating_scale: TASK_RATING_MAX,
        communication_rating: editComm,
        quality_rating: editQuality,
        teamwork_rating: editTeam,
      };
      return updated;
    });

    setEditingTaskIndex(null);
  };

  const handleCancelEditTask = () => {
    setEditingTaskIndex(null);
  };

  const handleDeleteTask = (indexToDelete: number) => {
    if (editingTaskIndex === indexToDelete) {
      setEditingTaskIndex(null);
    }
    setTasks((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    const payload: any = {
      enrollment_id: enrollmentId,
      attended_lessons_count: attended,
      total_lessons_count: totalLessons,
      completed_tasks_count: isIntern ? tasks.length : completedTasksCount,
      total_tasks_count: isIntern ? Math.max(tasks.length, 1) : totalTasks,
      batch_name: isIntern ? batchName : undefined,
      feedback: feedback.trim(),
      tasks: isIntern ? tasks : undefined,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
      personal_email: personalEmail.trim() || null,
    };

    try {
      const response = await api.put(`/students/${studentId}/progress`, payload);
      setToastMessage({ text: 'Student profile, tasks & progress updated successfully!', type: 'success' });
      
      setTimeout(() => {
        onSuccess({
          studentId,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          personal_email: personalEmail.trim(),
          attended_lessons_count: attended,
          total_lessons_count: totalLessons,
          completed_tasks_count: isIntern ? tasks.length : completedTasksCount,
          total_tasks_count: isIntern ? Math.max(tasks.length, 1) : totalTasks,
          batch_name: isIntern ? batchName : undefined,
          progress_percentage: estimatedOverall,
          feedback: feedback.trim(),
          tasks: isIntern ? tasks : undefined,
          scoring: response.data?.data?.scoring,
        });
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update student:', err);
      setToastMessage({
        text: err.response?.data?.detail || 'Failed to save student changes. Please try again.',
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
          maxWidth: '720px',
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Edit Student Details, Tasks & Progress
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
              Editing: <span style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>{studentName}</span>
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

          {/* 1. Student Personal & Contact Details */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--secondary-color)', marginBottom: '0.85rem' }}>
              <User size={17} />
              <span>Personal & Contact Information</span>
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <Phone size={13} />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +20 100 123 4567"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <Mail size={13} />
                  <span>Personal Email (Gmail)</span>
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="e.g. student@gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Days Attended Section */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 700, color: '#38BDF8' }}>
                <Calendar size={17} />
                <span>Days Attended</span>
              </label>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: attendancePct >= 75 ? '#10B981' : '#F59E0B' }}>
                {attendancePct}% Attendance Rate
              </span>
            </div>
            
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

          {/* 3. Tasks Management Section with FULL EDIT & DELETE & ADD */}
          {isIntern ? (
            <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 700, color: '#A855F7' }}>
                    <CheckCircle2 size={18} />
                    <span>Intern Tasks & Deliverables ({tasks.length} Saved)</span>
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Create, edit, or delete submitted deliverables, add task notes, and assign Communication, Quality & Teamwork scores out of 10.
                  </p>
                </div>
                {isIntern && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <span>Batch</span>
                    <select
                      value={batchName}
                      onChange={(event) => setBatchName(event.target.value as 'BATCH 1' | 'BATCH 2')}
                      style={{ padding: '0.4rem 0.55rem', borderRadius: '0.4rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600, outline: 'none' }}
                    >
                      <option value="BATCH 1">BATCH 1</option>
                      <option value="BATCH 2">BATCH 2</option>
                    </select>
                  </label>
                )}
                {!isAddingTask && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(true);
                      setEditingTaskIndex(null);
                    }}
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
                      Add New Task Deliverable
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Task Note / Feedback <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value.slice(0, 1000))}
                      placeholder="Add specific feedback or observations for this task..."
                      rows={3}
                      maxLength={1000}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{newNote.length}/1000</div>
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

                  {/* 3 Numeric Criteria Ratings */}
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '0.375rem',
                        background: 'none',
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
                        background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Save Task
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              {tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {tasks.map((task, idx) => {
                    const isEditing = editingTaskIndex === idx;
                    const taskAvg = averageTaskRating(task).toFixed(1);

                    if (isEditing) {
                      return (
                        <div
                          key={task.id || idx}
                          style={{
                            background: 'var(--bg-card)',
                            border: '2px solid #A855F7',
                            borderRadius: '0.625rem',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.2)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A855F7' }}>
                              ✏️ Editing Task #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelEditTask}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                              Task Name / Title *
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
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
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                              Task Note / Feedback <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                            </label>
                            <textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value.slice(0, 1000))}
                              placeholder="Add specific feedback or observations for this task..."
                              rows={3}
                              maxLength={1000}
                              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                            <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{editNote.length}/1000</div>
                          </div>

                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                              <LinkIcon size={12} />
                              <span>Submission Link</span>
                            </label>
                            <input
                              type="url"
                              value={editLink}
                              onChange={(e) => setEditLink(e.target.value)}
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

                          {/* 3 Numeric Criteria Ratings */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                            <CriteriaRating
                              label="Communication"
                              icon={<MessageCircle size={13} />}
                              value={editComm}
                              onChange={setEditComm}
                            />
                            <CriteriaRating
                              label="Task Quality"
                              icon={<Award size={13} />}
                              value={editQuality}
                              onChange={setEditQuality}
                            />
                            <CriteriaRating
                              label="Teamwork"
                              icon={<Users size={13} />}
                              value={editTeam}
                              onChange={setEditTeam}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={handleCancelEditTask}
                              style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '0.375rem',
                                background: 'none',
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
                              onClick={handleSaveEditTask}
                              style={{
                                padding: '0.4rem 1rem',
                                borderRadius: '0.375rem',
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Check size={14} />
                              <span>Update Task</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

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
                        }}
                      >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#A855F7' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
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
                                }}
                              >
                                <span>Link</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>

                          {task.note && (
                            <div style={{ marginTop: '0.35rem', padding: '0.5rem 0.65rem', borderLeft: '3px solid #A855F7', borderRadius: '0.25rem', background: 'rgba(168, 85, 247, 0.08)', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
                              <strong style={{ color: 'var(--text-main)' }}>Task Note:</strong> {task.note}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>Comm: <b style={{ color: '#38BDF8' }}>{task.communication_rating.toFixed(1)} / 10</b></span>
                            <span>Quality: <b style={{ color: '#A855F7' }}>{task.quality_rating.toFixed(1)} / 10</b></span>
                            <span>Team: <b style={{ color: '#10B981' }}>{task.teamwork_rating.toFixed(1)} / 10</b></span>
                            <span style={{ marginLeft: 'auto', fontWeight: 700, color: Number(taskAvg) >= 7 ? '#10B981' : '#F59E0B' }}>
                              Score: {taskAvg} / 10
                            </span>
                          </div>
                        </div>

                        {/* Action buttons: Edit & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditTask(idx)}
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              color: 'var(--secondary-color)',
                              borderRadius: '0.375rem',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            title="Edit Task & Ratings"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(idx)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              borderRadius: '0.375rem',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            title="Remove task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                Assignments & Tasks
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

          {/* 4. Feedback & Performance Notes Section */}
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
              <Sparkles size={15} />
              <span>{saving ? 'Saving...' : 'Save & Calculate'}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <input
          type="number"
          min={0}
          max={TASK_RATING_MAX}
          step={0.5}
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            onChange(Number.isFinite(parsed) ? Math.min(TASK_RATING_MAX, Math.max(0, parsed)) : 0);
          }}
          aria-label={`${label} score out of 10`}
          style={{ width: '100%', minWidth: 0, padding: '0.45rem 0.55rem', borderRadius: '0.375rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>/ 10</span>
      </div>
      <div style={{ display: 'none' }}>
        {([] as number[]).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              flex: 1,
              padding: '0.25rem 0',
              borderRadius: '0.25rem',
              border: 'none',
              background: star <= value ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'var(--bg-surface)',
              color: star <= value ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {star}★
          </button>
        ))}
      </div>
    </div>
  );
};
