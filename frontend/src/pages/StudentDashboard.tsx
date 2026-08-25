import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { StatCard, Card, ProgressBar } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Edit,
  MessageSquare,
  ExternalLink,
  Award,
  Users,
  MessageCircle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { EditStudentProgressModal, type TaskItem } from '../components/EditStudentProgressModal';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const StudentDashboard: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form state
  const [attendedLessons, setAttendedLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(10);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(12);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [studentTasks, setStudentTasks] = useState<TaskItem[]>([]);

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
      if (dashData?.overview?.feedback) {
        setCurrentFeedback(dashData.overview.feedback);
      }
      if (Array.isArray(dashData?.overview?.tasks)) {
        setStudentTasks(dashData.overview.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data, using fallback", err);
      const mockData = {
        overview: {
          student_name: "Student Performance Profile",
          student_code: "STU-2026",
          current_enrollment: {
            enrollment_id: id || "enc-1",
            course_title: "Active Program Track",
            progress: 80.0,
            overall_score: 85.5,
            classification: "good",
            attended_lessons_count: 8,
            total_lessons_count: 10,
            completed_tasks_count: 10,
            total_tasks_count: 12,
          },
          feedback: "Demonstrates consistent performance and deep engagement in practical exercises.",
          tasks: [],
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
      setCurrentFeedback(mockData.overview.feedback);
      setStudentTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading student dashboard...</div>;
  if (!data || !data.overview) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>No student data available.</div>;

  const { overview, attendance, assignments, scores, achievements } = data;
  const tasksToDisplay: TaskItem[] = studentTasks.length > 0 ? studentTasks : (overview.tasks || []);
  
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
      default: return { color: 'var(--text-muted)', label: 'Active' };
    }
  };

  const classInfo = overview.current_enrollment ? getClassificationInfo(overview.current_enrollment.classification) : getClassificationInfo('');

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="dashboard-header flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {overview.student_name}
            </h1>
            {id && (
              <button
                onClick={() => setIsEditOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Edit size={14} />
                <span>Edit Progress & Feedback</span>
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Performance analytics for {overview.current_enrollment?.course_title || 'Enrolled Course'}.</p>
        </div>
        
        {overview.current_enrollment && (
          <Card style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall AI Score</p>
              <div className="flex items-end gap-2">
                <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-main)' }}>
                  {overview.current_enrollment.overall_score || '--'}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', paddingBottom: '0.25rem' }}>/100</span>
              </div>
            </div>
            <div style={{ height: '40px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</p>
              <span style={{ 
                display: 'inline-block', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: classInfo.color === 'var(--error)' ? '#EF4444' : classInfo.color === 'var(--success)' ? '#10B981' : 'var(--secondary-color)'
              }}>
                {classInfo.label}
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Instructor Feedback Card */}
      {(overview.feedback || currentFeedback) && (
        <Card style={{ borderLeft: '4px solid var(--secondary-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.12)', 
                padding: '0.4rem', 
                borderRadius: '0.5rem',
                color: 'var(--secondary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={18} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Instructor Feedback & Notes
              </h3>
            </div>
            {overview.feedback_updated_at && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Updated: {new Date(overview.feedback_updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{ 
            background: 'var(--bg-surface)', 
            padding: '1rem 1.25rem', 
            borderRadius: '0.5rem', 
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '0.925rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {overview.feedback || currentFeedback}
          </div>
        </Card>
      )}

      {/* Intern Deliverables & Task Criteria Evaluation Breakdown */}
      {tasksToDisplay.length > 0 && (
        <Card style={{ borderLeft: '4px solid #A855F7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                background: 'rgba(168, 85, 247, 0.12)', 
                padding: '0.4rem', 
                borderRadius: '0.5rem',
                color: '#A855F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Intern Deliverables & Evaluation Breakdown
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {tasksToDisplay.length} tasks evaluated across Communication, Quality & Teamwork.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
            {tasksToDisplay.map((task, idx) => {
              const avgScore = ((task.communication_rating + task.quality_rating + task.teamwork_rating) / 3).toFixed(1);
              return (
                <div
                  key={task.id || idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.625rem',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#A855F7' }}>
                        Task #{idx + 1}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {task.title}
                      </div>
                    </div>
                    {task.submission_link && (
                      <a
                        href={task.submission_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--secondary-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: 'none',
                          background: 'rgba(99, 102, 241, 0.1)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                        }}
                      >
                        <span>Deliverable Link</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {/* Criteria Rating Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🗣️ Comm</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38BDF8' }}>{task.communication_rating}★</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🎯 Quality</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A855F7' }}>{task.quality_rating}★</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🤝 Team</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>{task.teamwork_rating}★</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Overall Task Score:</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: Number(avgScore) >= 4 ? '#10B981' : '#F59E0B' }}>
                      {avgScore} / 5.0 ⭐
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard 
          title="Attendance Rate" 
          value={`${attendance?.rate || 0}%`} 
          icon={<Calendar size={24} />} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={`${tasksToDisplay.length > 0 ? tasksToDisplay.length : (assignments?.submitted || 0)} / ${assignments?.total || 12}`} 
          icon={<CheckCircle size={24} />} 
        />
      </div>

      <div className="dashboard-grid-2">
        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
            AI Performance Profile
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Radar name="Student" dataKey="A" stroke="var(--secondary-color)" fill="var(--secondary-color)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
            Recent Achievements
          </h3>
          <div className="flex flex-col gap-4">
            {achievements && achievements.length > 0 ? (
              achievements.map((ach: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '2rem' }}>{ach.icon}</div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ach.title}</h4>
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
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
          Assignments Progress
        </h3>
        <div className="flex flex-col gap-4">
          <ProgressBar value={assignments?.average_score || 80} label="Average Score" color="var(--secondary-color)" />
          <div className="flex justify-between" style={{ marginTop: '1rem' }}>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{assignments?.total || 12}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                {tasksToDisplay.length > 0 ? tasksToDisplay.length : (assignments?.submitted || 0)}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Submitted</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                {Math.max(0, (assignments?.total || 12) - (tasksToDisplay.length > 0 ? tasksToDisplay.length : (assignments?.submitted || 0)))}
              </p>
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
          initialFeedback={overview?.feedback || currentFeedback || ''}
          initialTasks={tasksToDisplay}
          isIntern={true}
          onSuccess={(res) => {
            if (res?.feedback !== undefined) {
              setCurrentFeedback(res.feedback);
            }
            if (res?.tasks !== undefined) {
              setStudentTasks(res.tasks);
            }
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
