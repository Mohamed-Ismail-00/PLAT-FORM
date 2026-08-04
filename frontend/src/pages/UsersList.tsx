import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Card } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { EditStudentProgressModal } from '../components/EditStudentProgressModal';
import { AddStudentModal } from '../components/AddStudentModal';

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
      const res = await api.get('/students?page_size=1000');
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
      const res = await api.get('/courses');
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

  // Handle student deletion
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${studentName}" from the system?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(studentId);
    try {
      await api.delete(`/students/${studentId}`);
      setDeleteToast({ text: `✅ ${studentName} has been removed successfully.`, type: 'success' });
      await fetchStudents();
      setTimeout(() => setDeleteToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete student:', err);
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
            Intern Students Management
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time track monitoring & direct progress updates for {students.length} interns across tracks.
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
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? 'var(--secondary-color)' : 'var(--bg-secondary)',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 212, 170, 0.25)' : 'none',
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1rem' }}>+</span> Add Student
          </button>
        )}
      </div>

      {/* Student List Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '0.875rem 1rem' }}>Student Name</th>
                <th style={{ padding: '0.875rem 1rem' }}>Code</th>
                <th style={{ padding: '0.875rem 1rem' }}>Track</th>
                <th style={{ padding: '0.875rem 1rem' }}>Attended Lectures</th>
                <th style={{ padding: '0.875rem 1rem' }}>Tasks Done</th>
                <th style={{ padding: '0.875rem 1rem' }}>Progress</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const attended = student.attended_lessons_count ?? 0;
                  const totalL = student.total_lessons_count ?? 10;
                  const completedT = student.completed_tasks_count ?? 0;
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
                        <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{student.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</div>
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
                        {completedT} / {totalT} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({taskPct}%)</span>
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
                              background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(14, 165, 233, 0.3)'
                            }}
                          >
                            ✏️ Edit Progress
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/users/${student.id}`)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Dashboard
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
                            }}
                            title="Remove student"
                          >
                            {isBeingDeleted ? '⏳' : '🗑️'}
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
          initialCompletedTasks={editingStudent.completed_tasks_count ?? 0}
          initialTotalTasks={editingStudent.total_tasks_count ?? 12}
          onSuccess={fetchStudents}
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
