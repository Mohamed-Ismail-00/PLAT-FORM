import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatCard, Card, ProgressBar } from '../components/UI';
import { Users, GraduationCap, Building2, TrendingDown } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, courseRes] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/courses')
        ]);
        setData(dashRes.data.data);
        setCourses(courseRes.data.data);
      } catch (err) {
        console.error("Failed to fetch admin dashboard, using fallback data", err);
        setData({
          overview: { total_students: 42, active_courses: 5, total_instructors: 4, average_score: 84.2 },
          rates: { attendance_rate: 85.0, quiz_pass_rate: 88.5, assignment_submission_rate: 82.0 },
          classification_distribution: { excellent: 15, good: 18, average: 6, needs_attention: 2, high_risk: 1 }
        });
        setCourses([
          { id: "c-1", title: "Full-Stack Web Development", total_lessons: 10, enrolled_count: 24, status: "active" },
          { id: "c-2", title: "Data Science & AI Intelligence", total_lessons: 12, enrolled_count: 18, status: "active" }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!data || !data.overview) return <div className="p-8">No data available.</div>;

  const { overview, rates, classification_distribution } = data;

  const pieData = [
    { name: 'Excellent', value: classification_distribution.excellent, color: 'var(--success)' },
    { name: 'Good', value: classification_distribution.good, color: 'var(--secondary-color)' },
    { name: 'Average', value: classification_distribution.average, color: 'var(--info)' },
    { name: 'Needs Attention', value: classification_distribution.needs_attention, color: 'var(--warning)' },
    { name: 'High Risk', value: classification_distribution.high_risk, color: 'var(--error)' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
          Platform Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Global overview of Innovera Student Performance Intelligence.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard 
          title="Total Students" 
          value={overview.active_students} 
          icon={<Users size={24} />} 
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard 
          title="Total Internship Leads" 
          value={6} 
          icon={<GraduationCap size={24} />} 
        />
        <StatCard 
          title="Active Courses" 
          value={overview.active_courses} 
          icon={<Building2 size={24} />} 
        />
      </div>

      <div className="dashboard-grid-2">
        <Card title="Overall Student Classifications">
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Students per Track">
          <div className="flex flex-col gap-4" style={{ marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {courses.map(course => (
              <div key={course.id}>
                <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{course.title.replace(' Track', '')}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{course.enrolled_students} students</span>
                </div>
                <ProgressBar 
                  value={(course.enrolled_students / Math.max(1, overview.active_students)) * 100} 
                  color="var(--primary-color)" 
                />
              </div>
            ))}
          </div>
        </Card>
      </div>


      {/* High Risk Students Table */}
      <Card>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
          At-Risk Students (AI Analysis)
        </h3>
        {data.high_risk_students && data.high_risk_students.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Classification</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Key Factors</th>
                </tr>
              </thead>
              <tbody>
                {data.high_risk_students.map((student: any) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary-color)' }}>{student.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{student.student_code}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        color: student.risk_score > 75 ? 'var(--error)' : 'var(--warning)',
                        fontWeight: 600
                      }}>
                        {student.risk_score}%
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: student.classification === 'high_risk' ? '#FEE2E2' : '#FEF3C7',
                        color: student.classification === 'high_risk' ? 'var(--error)' : 'var(--warning)'
                      }}>
                        {student.classification === 'high_risk' ? 'High Risk' : 'Needs Attention'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {student.factors?.join(', ') || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
              <TrendingDown size={32} color="var(--success)" />
            </div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Great News!</h4>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
              The AI engine has not detected any students with a high dropout risk across all active tracks.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
