import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatCard, Card, ProgressBar } from '../components/UI';
import { Users, BookOpen, AlertTriangle, Activity } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const InstructorDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard/instructor');
        setData(res.data.data);
      } catch (err) {
        console.error("Failed to fetch instructor dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!data || !data.overview) return <div className="p-8">No data available.</div>;

  const { overview, courses, inactive_students } = data;

  // Prepare chart data from courses
  const riskData = courses.length > 0 ? Object.entries(courses[0].classification_distribution).map(([key, val]) => ({
    name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    students: val
  })) : [];

  const COLORS = {
    'Excellent': 'var(--success)',
    'Good': 'var(--secondary-color)',
    'Average': 'var(--info)',
    'Needs Attention': 'var(--warning)',
    'High Risk': 'var(--error)'
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
          Instructor Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Overview of your classes and student performance.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard 
          title="Total Students" 
          value={overview.total_students} 
          icon={<Users size={24} />} 
        />
        <StatCard 
          title="Active Courses" 
          value={overview.active_courses} 
          icon={<BookOpen size={24} />} 
        />
        <StatCard 
          title="Needs Attention" 
          value={overview.students_needing_attention} 
          icon={<AlertTriangle size={24} color="var(--warning)" />} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
            Class Risk Distribution
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 5, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || 'var(--primary-color)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)' }}>
              Inactive Students Alert
            </h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--error)', backgroundColor: '#FEE2E2', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
              {inactive_students.length} Total
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Student</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Course</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Inactive For</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inactive_students.length > 0 ? inactive_students.map((student: any) => (
                  <tr key={student.student_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>{student.student_name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{student.course_title}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--error)', fontWeight: 500 }}>{student.days_inactive} days</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Message</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No inactive students found. Great job!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InstructorDashboard;
