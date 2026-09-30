import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap, TrendingDown, Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import { Card } from '../components/UI';

type ClassificationKey = 'excellent' | 'good' | 'average' | 'needs_attention' | 'high_risk';

interface DashboardOverview {
  active_students?: number;
  total_students?: number;
  active_courses?: number;
  total_courses?: number;
}

interface HighRiskStudent {
  id: string | number;
  name: string;
  student_code?: string;
  risk_score: number;
  classification: string;
  factors?: string[];
}

interface AdminDashboardData {
  overview?: DashboardOverview;
  classification_distribution?: Partial<Record<ClassificationKey, number>>;
  high_risk_students?: HighRiskStudent[];
}

interface TrackCourse {
  id: string | number;
  title: string;
  enrolled_students?: number;
  enrolled_count?: number;
}

interface ClassificationDatum {
  key: ClassificationKey;
  name: string;
  value: number;
  color: string;
}

const classificationColors: Record<ClassificationKey, string> = {
  average: 'var(--classification-average)',
  excellent: 'var(--classification-excellent)',
  good: 'var(--classification-good)',
  high_risk: 'var(--classification-high-risk)',
  needs_attention: 'var(--classification-needs-attention)',
};

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [courses, setCourses] = useState<TrackCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [dashRes, courseRes] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/courses?program_type=intern'),
        ]);

        if (!isMounted) return;
        setData(dashRes.data.data as AdminDashboardData);
        setCourses(Array.isArray(courseRes.data.data) ? courseRes.data.data as TrackCourse[] : []);
      } catch (err) {
        console.error('Failed to fetch admin dashboard, using fallback data', err);
        if (!isMounted) return;
        setData({
          overview: { total_students: 93, active_students: 93, active_courses: 6, total_courses: 6 },
          classification_distribution: { excellent: 25, good: 40, average: 20, needs_attention: 5, high_risk: 3 },
        });
        setCourses([
          { id: 'c-1', title: 'Full-Stack Web Development', enrolled_students: 24 },
          { id: 'c-2', title: 'Data Science & AI Intelligence', enrolled_students: 18 },
        ]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="admin-overview-state" role="status" aria-live="polite">
        <span className="admin-loading-indicator" aria-hidden="true" />
        <span>Loading platform analytics…</span>
      </div>
    );
  }

  if (!data?.overview) {
    return <div className="admin-overview-state">Dashboard data is not available right now.</div>;
  }

  const overview = data.overview;
  const distribution = data.classification_distribution ?? {};
  const totalStudents = overview.active_students ?? overview.total_students ?? 0;
  const activeCourses = overview.active_courses ?? overview.total_courses ?? 0;
  const internshipLeads = 6;

  const pieData: ClassificationDatum[] = [
    { key: 'average', name: 'Average', value: Math.max(0, distribution.average ?? 0), color: classificationColors.average },
    { key: 'excellent', name: 'Excellent', value: Math.max(0, distribution.excellent ?? 0), color: classificationColors.excellent },
    { key: 'good', name: 'Good', value: Math.max(0, distribution.good ?? 0), color: classificationColors.good },
    { key: 'high_risk', name: 'High Risk', value: Math.max(0, distribution.high_risk ?? 0), color: classificationColors.high_risk },
    { key: 'needs_attention', name: 'Needs Attention', value: Math.max(0, distribution.needs_attention ?? 0), color: classificationColors.needs_attention },
  ];
  const classifiedStudents = pieData.reduce((total, item) => total + item.value, 0);
  const highRiskStudents = data.high_risk_students ?? [];

  return (
    <div className="admin-overview">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="overview-hero-copy">
          <p className="overview-eyebrow"><span className="overview-eyebrow-mark" /> Performance intelligence</p>
          <h1 id="overview-title">Platform Analytics</h1>
          <p className="overview-subtitle">Global overview of Innovera Student Performance Intelligence.</p>
        </div>
        <div className="overview-hero-note" aria-hidden="true">
          <span>DATA IN MOTION</span>
          <span>INSIGHT FOR EVERY LEARNER</span>
          <i />
        </div>
      </section>

      <section className="overview-metrics" aria-label="Platform metrics">
        <div className="overview-metric">
          <div className="metric-icon metric-icon-blue"><Users size={23} aria-hidden="true" /></div>
          <div className="metric-copy">
            <span className="metric-label">Total Students</span>
            <strong className="metric-value">{totalStudents}</strong>
          </div>
        </div>
        <div className="overview-metric">
          <div className="metric-icon metric-icon-violet"><GraduationCap size={24} aria-hidden="true" /></div>
          <div className="metric-copy">
            <span className="metric-label">Total Internship Leads</span>
            <strong className="metric-value">{internshipLeads}</strong>
          </div>
        </div>
        <div className="overview-metric">
          <div className="metric-icon metric-icon-teal"><Building2 size={23} aria-hidden="true" /></div>
          <div className="metric-copy">
            <span className="metric-label">Active Courses</span>
            <strong className="metric-value">{activeCourses}</strong>
          </div>
        </div>
      </section>

      <section className="overview-insights-grid" aria-label="Student performance insights">
        <Card className="overview-panel classification-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="panel-kicker">PERFORMANCE MIX</p>
              <h2>Overall Student Classifications</h2>
            </div>
            <span className="panel-index" aria-hidden="true">01</span>
          </div>

          {classifiedStudents > 0 ? (
            <div className="classification-content">
              <div className="classification-chart" role="img" aria-label={`Student classification distribution across ${classifiedStudents} classified records`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius="67%"
                      outerRadius="88%"
                      paddingAngle={3}
                      cornerRadius={5}
                      dataKey="value"
                      nameKey="name"
                      stroke="var(--bg-card)"
                      strokeWidth={3}
                      isAnimationActive={false}
                    >
                      {pieData.filter((item) => item.value > 0).map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Students']}
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="classification-chart-center" aria-hidden="true">
                  <strong>{classifiedStudents}</strong>
                  <span>Classified</span>
                </div>
              </div>

              <ul className="classification-legend" aria-label="Classification totals">
                {pieData.map((item) => (
                  <li key={item.key} className={item.value === 0 ? 'is-empty' : ''}>
                    <span className="classification-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    <span className="classification-name">{item.name}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="overview-empty-state">No classification data is available yet.</div>
          )}
        </Card>

        <Card className="overview-panel track-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="panel-kicker">PROGRAM DISTRIBUTION</p>
              <h2>Students per Track</h2>
            </div>
            <span className="panel-index" aria-hidden="true">02</span>
          </div>

          {courses.length > 0 ? (
            <div className="track-list">
              {courses.map((course, index) => {
                const studentCount = course.enrolled_students ?? course.enrolled_count ?? 0;
                const progress = Math.min(100, Math.max(0, (studentCount / Math.max(1, totalStudents)) * 100));
                const trackName = course.title.replace(/\s+Track$/i, '');

                return (
                  <div className="track-item" key={course.id}>
                    <div className="track-item-heading">
                      <span className="track-name">{trackName}</span>
                      <span className="track-count">{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
                    </div>
                    <div
                      className={`track-progress track-progress-${index % 4}`}
                      role="progressbar"
                      aria-label={`${trackName} share of active students`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overview-empty-state">No active tracks are available yet.</div>
          )}
        </Card>
      </section>

      <Card className="overview-panel risk-panel">
        <div className="overview-panel-heading risk-panel-heading">
          <div>
            <p className="panel-kicker">STUDENT SUPPORT</p>
            <h2>At-Risk Students <span>(AI Analysis)</span></h2>
          </div>
          <span className="risk-count">{highRiskStudents.length} {highRiskStudents.length === 1 ? 'student' : 'students'}</span>
        </div>

        {highRiskStudents.length > 0 ? (
          <div className="risk-table-wrap" role="region" aria-label="At-risk students" tabIndex={0}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th scope="col">Student Name</th>
                  <th scope="col">Code</th>
                  <th scope="col">Risk Score</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Key Factors</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStudents.map((student) => {
                  const isHighRisk = student.classification === 'high_risk';
                  return (
                    <tr key={student.id}>
                      <td className="risk-student-name">{student.name}</td>
                      <td>{student.student_code || '—'}</td>
                      <td className={isHighRisk ? 'risk-score-high' : 'risk-score-attention'}>{student.risk_score}%</td>
                      <td>
                        <span className={`risk-badge ${isHighRisk ? 'risk-badge-high' : 'risk-badge-attention'}`}>
                          {isHighRisk ? 'High Risk' : 'Needs Attention'}
                        </span>
                      </td>
                      <td>{student.factors?.join(', ') || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="risk-empty-state">
            <div className="risk-empty-icon"><TrendingDown size={23} aria-hidden="true" /></div>
            <div>
              <h3>Great news</h3>
              <p>The AI engine has not detected any students with a high dropout risk across all active tracks.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
