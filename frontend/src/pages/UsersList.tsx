import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Card } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { EditStudentProgressModal, type TaskItem } from '../components/EditStudentProgressModal';
import { AddStudentModal } from '../components/AddStudentModal';
import { MessageSquare, Plus, Trash2, Edit3, Eye, ExternalLink, CheckCircle2 } from 'lucide-react';

const UsersList: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<string>('All');
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students?page_size=1000&program_type=intern');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setStudents(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch students from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses?program_type=intern');
      setCourses(res.data.data);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  // Build dynamic track list from courses
  const tracks = ['All', ...courses.map(c => c.title)];
  // If no courses loaded, fallback to student-derived tracks
  const effectiveTracks = courses.length > 0 
    ? tracks 
    : ['All', ...Array.from(new Set(students.map(s => s.track_name).filter(Boolean)))];

  const filteredStudents = selectedTrack === 'All' 
    ? students 
    : students.filter(s => s.track_name?.toLowerCase().includes(selectedTrack.toLowerCase()) || s.track_name === selectedTrack);

  // Find the course_id for the currently selected track
  const selectedCourse = courses.find(c => c.title === selectedTrack);

  const handleProgressUpdated = (updatedInfo: any) => {
    if (updatedInfo && updatedInfo.studentId) {
      setStudents(prev => prev.map(s => {
        if (s.id === updatedInfo.studentId) {
          return {
            ...s,
            attended_lessons_count: updatedInfo.attended_lessons_count,
            total_lessons_count: updatedInfo.total_lessons_count,
            completed_tasks_count: updatedInfo.completed_tasks_count,
            total_tasks_count: updatedInfo.total_tasks_count,
            progress_percentage: updatedInfo.progress_percentage,
            feedback: updatedInfo.feedback,
            tasks: updatedInfo.tasks || s.tasks || [],
          };
        }
        return s;
      }));
    }
    fetchStudents();
  };

  // Handle student deletion
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${studentName}" from the system?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(studentId);
    const backupStudents = [...students];
    // Optimistic instant delete
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setDeleteToast({ text: `✅ ${studentName} has been removed successfully.`, type: 'success' });
    setTimeout(() => setDeleteToast(null), 3000);

    try {
      await api.delete(`/students/${studentId}`);
      fetchStudents();
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      setStudents(backupStudents);
      setDeleteToast({ text: err.response?.data?.detail || 'Failed to remove student. Please try again.', type: 'error' });
      setTimeout(() => setDeleteToast(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading students database...</div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            Intern Students Management
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time track monitoring, task deliverables evaluation & instructor feedback for {students.length} interns across tracks.
          </p>
        </div>
      </div>

      {/* Delete Toast Notification */}
      {deleteToast && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            backgroundColor: deleteToast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${deleteToast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: deleteToast.type === 'success' ? '#10B981' : '#EF4444',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {deleteToast.text}
        </div>
      )}

      {/* Track Filter Tabs + Add Student Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div className="flex flex-wrap gap-2">
          {effectiveTracks.map((track) => {
            const count = track === 'All' 
              ? students.length 
              : students.filter(s => s.track_name?.toLowerCase().includes(track.toLowerCase())).length;
            const isActive = selectedTrack === track;

            return (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: isActive ? '1px solid transparent' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isActive ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'var(--bg-card)',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                {track} <span style={{ opacity: 0.8, fontSize: '0.75rem', marginLeft: '0.25rem' }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Add Student Button — only when a specific track is selected */}
        {selectedTrack !== 'All' && selectedCourse && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={16} />
            <span>Add Student to {selectedTrack}</span>
          </button>
        )}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ padding: '0.875rem 1rem' }}>Student Name & Feedback</th>
                <th style={{ padding: '0.875rem 1rem' }}>Code</th>
                <th style={{ padding: '0.875rem 1rem' }}>Track</th>
                <th style={{ padding: '0.875rem 1rem' }}>Attended Lectures</th>
                <th style={{ padding: '0.875rem 1rem' }}>Tasks & Deliverables</th>
                <th style={{ padding: '0.875rem 1rem' }}>Progress</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const attended = student.attended_lessons_count ?? 0;
                  const totalL = student.total_lessons_count ?? 10;
                  const tasksList: TaskItem[] = Array.isArray(student.tasks) ? student.tasks : [];
                  const completedT = tasksList.length > 0 ? tasksList.length : (student.completed_tasks_count ?? 0);
                  const totalT = student.total_tasks_count ?? 12;
                  
                  const attPct = totalL > 0 ? Math.round((attended / totalL) * 100) : 0;
                  const taskPct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
                  const overallPct = Math.round((attPct * 0.4) + (taskPct * 0.6));
                  const isBeingDeleted = deletingId === student.id;

                  return (
                    <tr 
                      key={student.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        transition: 'all 0.3s',
                        opacity: isBeingDeleted ? 0.4 : 1,
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</div>
                        {student.feedback && (
                          <div 
                            style={{ 
                              marginTop: '0.4rem', 
                              fontSize: '0.75rem', 
                              color: 'var(--secondary-color)', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              background: 'rgba(99, 102, 241, 0.1)', 
                              padding: '0.2rem 0.55rem', 
                              borderRadius: '0.375rem', 
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              maxWidth: '260px'
                            }}
                            title={`Feedback: ${student.feedback}`}
                          >
                            <MessageSquare size={12} style={{ flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {student.feedback}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {student.student_code}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          backgroundColor: 'rgba(56, 189, 248, 0.12)', 
                          color: '#38BDF8', 
                          padding: '0.25rem 0.625rem', 
                          borderRadius: '0.375rem', 
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}>
                          {student.track_name || 'General Track'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {attended} / {totalL} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({attPct}%)</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <div>
                          <span>{completedT} / {totalT}</span> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({taskPct}%)</span>
                        </div>
                        {tasksList.length > 0 && (
                          <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            <span 
                              style={{ 
                                fontSize: '0.7rem', 
                                background: 'rgba(168, 85, 247, 0.12)', 
                                color: '#A855F7', 
                                padding: '0.15rem 0.45rem', 
                                borderRadius: '0.25rem',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title={tasksList.map(t => `${t.title} (Comm: ${t.communication_rating}★, Qual: ${t.quality_rating}★, Team: ${t.teamwork_rating}★)`).join('\n')}
                            >
                              <CheckCircle2 size={11} />
                              <span>{tasksList.length} Tasks Evaluated</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${overallPct}%`, 
                              backgroundColor: overallPct >= 75 ? '#10B981' : overallPct >= 50 ? '#F59E0B' : '#EF4444',
                              borderRadius: '999px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{overallPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingStudent(student)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: '0.375rem',
                              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit Progress</span>
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/users/${student.id}`)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Eye size={13} />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.full_name)}
                            disabled={isBeingDeleted}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: '0.375rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              opacity: isBeingDeleted ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove student"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students found for track "{selectedTrack}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Student Progress Modal */}
      {editingStudent && (
        <EditStudentProgressModal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          studentId={editingStudent.id}
          studentName={editingStudent.full_name}
          initialAttended={editingStudent.attended_lessons_count ?? 0}
          initialTotalLessons={editingStudent.total_lessons_count ?? 10}
          initialCompletedTasks={editingStudent.completed_tasks_count ?? (Array.isArray(editingStudent.tasks) ? editingStudent.tasks.length : 0)}
          initialTotalTasks={editingStudent.total_tasks_count ?? 12}
          initialFeedback={editingStudent.feedback || ''}
          initialTasks={Array.isArray(editingStudent.tasks) ? editingStudent.tasks : []}
          isIntern={true}
          onSuccess={handleProgressUpdated}
        />
      )}

      {/* Add Student Modal */}
      {showAddModal && selectedCourse && (
        <AddStudentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          trackName={selectedTrack}
          courseId={selectedCourse.id}
          onSuccess={() => {
            fetchStudents();
          }}
        />
      )}
    </div>
  );
};

export default UsersList;
