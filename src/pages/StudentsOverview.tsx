import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatCard, Card, ProgressBar } from '../components/UI';
import { Users, BookOpen, Award } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts';

const StudentsOverview: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studRes, courseRes] = await Promise.all([
          api.get('/students?page_size=1000&program_type=student'),
          api.get('/courses?program_type=student')
        ]);
        setStudents(studRes.data.data || []);
        setCourses(courseRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch students overview data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading overview...</div>;

  const totalStudents = students.length;

  // Calculate attendance distribution
  const excellentAtt = students.filter(s => {
    const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
    return att >= 85;
  }).length;
  const goodAtt = students.filter(s => {
    const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
    return att >= 70 && att < 85;
  }).length;
  const avgAtt = students.filter(s => {
    const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
    return att >= 50 && att < 70;
  }).length;
  const lowAtt = students.filter(s => {
    const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
    return att < 50;
  }).length;

  // Average attendance rate
  const avgAttRate = totalStudents > 0 
    ? Math.round(students.reduce((sum, s) => {
        const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
        return sum + att;
      }, 0) / totalStudents) 
    : 0;

  const pieData = [
    { name: 'Excellent (85%+)', value: excellentAtt, color: '#10B981' },
    { name: 'Good (70-84%)', value: goodAtt, color: '#8B5CF6' },
    { name: 'Average (50-69%)', value: avgAtt, color: '#F59E0B' },
    { name: 'Low (<50%)', value: lowAtt, color: '#EF4444' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
          Innovera Students Overview
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Course students analytics and attendance overview.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard 
          title="Total Students" 
          value={totalStudents} 
          icon={<Users size={24} />} 
        />
        <StatCard 
          title="Active Courses" 
          value={courses.length} 
          icon={<BookOpen size={24} />} 
        />
        <StatCard 
          title="Avg Attendance Rate" 
          value={`${avgAttRate}%`} 
          icon={<Award size={24} />} 
        />
      </div>

      <div className="dashboard-grid-2">
        <Card title="Attendance Distribution">
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

        <Card title="Students per Course">
          <div className="flex flex-col gap-4" style={{ marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {courses.map(course => {
              const studentCount = course.enrolled_students ?? course.enrolled_count ?? 0;
              return (
                <div key={course.id}>
                  <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{course.title}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{studentCount} students</span>
                  </div>
                  <ProgressBar 
                    value={(studentCount / Math.max(1, totalStudents)) * 100} 
                    color="#8B5CF6" 
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Low Attendance Students */}
      <Card>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
          Students with Low Attendance ({'<'}50%)
        </h3>
        {(() => {
          const lowAttStudents = students.filter(s => {
            const att = s.total_lessons_count > 0 ? (s.attended_lessons_count / s.total_lessons_count) * 100 : 0;
            return att < 50 && att >= 0;
          }).sort((a, b) => {
            const attA = a.total_lessons_count > 0 ? (a.attended_lessons_count / a.total_lessons_count) : 0;
            const attB = b.total_lessons_count > 0 ? (b.attended_lessons_count / b.total_lessons_count) : 0;
            return attA - attB;
          });

          if (lowAttStudents.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                  <Award size={32} color="var(--success)" />
                </div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Great News!</h4>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                  All students have attendance rates above 50%.
                </p>
              </div>
            );
          }

          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Course</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Attendance</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lowAttStudents.slice(0, 15).map((student: any) => {
                    const attPct = student.total_lessons_count > 0 
                      ? Math.round((student.attended_lessons_count / student.total_lessons_count) * 100) 
                      : 0;
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary-color)' }}>{student.full_name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.12)',
                            color: '#8B5CF6',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}>
                            {student.track_name}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                          {student.attended_lessons_count} / {student.total_lessons_count}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            color: attPct === 0 ? 'var(--error)' : 'var(--warning)',
                            fontWeight: 600
                          }}>
                            {attPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Card>
    </div>
  );
};

export default StudentsOverview;
