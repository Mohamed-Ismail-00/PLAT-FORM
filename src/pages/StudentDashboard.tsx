import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { StatCard, Card, ProgressBar } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Edit,
  Save,
  X
} from 'lucide-react';
import { EditStudentProgressModal } from '../components/EditStudentProgressModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const StudentDashboard: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [attendedLessons, setAttendedLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(10);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(12);

  const fetchData = async () => {
    try {
      const endpoint = id ? `/dashboard/student/${id}` : '/dashboard/student';
      const res = await api.get(endpoint);
      const dashData = res.data.data;
      setData(dashData);
      
      if (dashData?.overview?.current_enrollment) {
        const enc = dashData.overview.current_enrollment;
        setAttendedLessons(enc.attended_lessons_count || dashData.attendance?.present || 0);
        setTotalLessons(enc.total_lessons_count || dashData.attendance?.total_lessons || 10);
        setCompletedTasks(enc.completed_tasks_count || dashData.assignments?.submitted || 0);
        setTotalTasks(enc.total_tasks_count || dashData.assignments?.total || 12);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data, using preview fallback", err);
      const mockData = {
        overview: {
          student_name: "Ahmed Hassan",
          student_code: "STU-2026-001",
          current_enrollment: {
            enrollment_id: id || "enc-1",
            course_title: "Full-Stack Web Development",
            progress: 80.0,
            overall_score: 85.5,
            classification: "good",
            attended_lessons_count: 8,
            total_lessons_count: 10,
            completed_tasks_count: 10,
            total_tasks_count: 12,
          },
        },
        attendance: { rate: 80.0, present: 8, absent: 2, late: 0, total_lessons: 10 },
        quizzes: { average_score: 88.0, total_quizzes: 5, completed: 5, best_score: 95, worst_score: 80 },
        assignments: { average_score: 83.3, total: 12, submitted: 10, graded: 10, pending: 2 },
        projects: [],
        progress: { lessons_completed: 8, total_lessons: 10, percentage: 80.0, videos_completed: 8, total_videos: 10 },
        scores: { engagement: 85, consistency: 80, activity: 90, attendance: 80, quiz: 88, assignment: 83 },
        study_time: { total_hours_this_week: 14.5, total_hours_this_month: 52.0, avg_daily_minutes: 120 },
        achievements: [
          { icon: "🏆", title: "Top Performer", description: "Consistently scored above 80%" },
          { icon: "🔥", title: "Active Streak", description: "Completed 10 tasks on time" }
        ],
      };
      setData(mockData);
      setAttendedLessons(8);
      setTotalLessons(10);
      setCompletedTasks(10);
      setTotalTasks(12);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/students/${id}/progress`, {
        attended_lessons_count: Number(attendedLessons),
        total_lessons_count: Number(totalLessons),
        completed_tasks_count: Number(completedTasks),
        total_tasks_count: Number(totalTasks),
      });
      setIsEditOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to update student progress", err);
      alert("Error updating progress");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!data || !data.overview) return <div className="p-8">No data available.</div>;

  const { overview, attendance, quizzes, assignments, progress, scores, study_time, achievements } = data;
  
  // Format data for radar chart (AI Score Profile)
  const radarData = [
    { subject: 'Engagement', A: scores.engagement || 0, fullMark: 100 },
    { subject: 'Consistency', A: scores.consistency || 0, fullMark: 100 },
    { subject: 'Activity', A: scores.activity || 0, fullMark: 100 },
    { subject: 'Attendance', A: scores.attendance || 0, fullMark: 100 },
    { subject: 'Quizzes', A: scores.quiz || 0, fullMark: 100 },
    { subject: 'Assignments', A: scores.assignment || 0, fullMark: 100 },
  ];

  // Map classification to color and label
  const getClassificationInfo = (classification: string) => {
    switch (classification) {
      case 'excellent': return { color: 'var(--success)', label: 'Excellent' };
      case 'good': return { color: 'var(--secondary-color)', label: 'Good' };
      case 'average': return { color: 'var(--warning)', label: 'Average' };
      case 'needs_attention': return { color: 'var(--warning)', label: 'Needs Attention' };
      case 'high_risk': return { color: 'var(--error)', label: 'High Risk' };
      default: return { color: 'var(--text-muted)', label: 'Pending' };
    }
  };

  const classInfo = overview.current_enrollment ? getClassificationInfo(overview.current_enrollment.classification) : getClassificationInfo('');

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="dashboard-header flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
              {overview.student_name}
            </h1>
            {id && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm transition"
              >
                <Edit size={16} />
                Edit Progress
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Performance overview for {overview.current_enrollment?.course_title || 'your courses'}.</p>
        </div>
        
        {overview.current_enrollment && (
          <Card style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--primary-color)', color: 'white' }}>
            <div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Overall AI Score</p>
              <div className="flex items-end gap-2">
                <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                  {overview.current_enrollment.overall_score || '--'}
                </span>
                <span style={{ fontSize: '0.875rem', opacity: 0.8, paddingBottom: '0.25rem' }}>/100</span>
              </div>
            </div>
            <div style={{ height: '40px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
            <div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Status</p>
              <span style={{ 
                display: 'inline-block', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '999px', 
                backgroundColor: 'rgba(255,255,255,0.2)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: classInfo.color === 'var(--error)' ? '#ff8a8a' : classInfo.color === 'var(--success)' ? '#8affb1' : 'white'
              }}>
                {classInfo.label}
              </span>
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard 
          title="Attendance Rate" 
          value={`${attendance.rate}%`} 
          icon={<Calendar size={24} />} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={`${assignments.submitted} / ${assignments.total}`} 
          icon={<CheckCircle size={24} />} 
        />
      </div>

      <div className="dashboard-grid-2">
        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
            AI Performance Profile
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Radar name="Student" dataKey="A" stroke="var(--secondary-color)" fill="var(--secondary-color)" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
            Recent Achievements
          </h3>
          <div className="flex flex-col gap-4">
            {achievements.length > 0 ? (
              achievements.map((ach: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '2rem' }}>{ach.icon}</div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{ach.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{ach.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>Keep learning to unlock achievements!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      <Card>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
          Assignments Progress
        </h3>
        <div className="flex flex-col gap-4">
          <ProgressBar value={assignments.average_score} label="Average Score" color="var(--primary-color)" />
          <div className="flex justify-between" style={{ marginTop: '1rem' }}>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{assignments.total}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{assignments.submitted}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Submitted</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{assignments.pending}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Progress Modal */}
      {isEditOpen && id && (
        <EditStudentProgressModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          studentId={id}
          studentName={overview?.student_name || 'Student'}
          initialAttended={attendedLessons}
          initialTotalLessons={totalLessons}
          initialCompletedTasks={completedTasks}
          initialTotalTasks={totalTasks}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
