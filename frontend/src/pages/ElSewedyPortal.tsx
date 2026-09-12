import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, CalendarDays, CheckCircle2, ChevronRight,
  Download, ExternalLink, FileText, LogOut, MessageSquareText,
  Search, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';
import partnerApi from '../services/partnerApi';
import { usePartnerAuth } from '../context/PartnerAuthContext';

const TRACKS = ['Software Engineering', 'Artificial Intelligence'] as const;
type PortalTab = 'overview' | 'cohorts' | 'directory' | 'reports';
type TrackFilter = 'All' | (typeof TRACKS)[number];

interface PartnerOverview {
  organization_name: string;
  program_name: string;
  program_period: string;
  program_status: string;
  total_students: number;
  total_tracks: number;
  attendance_percentage: number;
  task_completion_percentage: number;
  average_performance: number;
  reports_pending: number;
  certificates_issued: number;
}

interface PartnerTask {
  id?: string;
  title: string;
  submission_link?: string;
  note?: string;
  communication_rating?: number;
  quality_rating?: number;
  teamwork_rating?: number;
}

interface PartnerStudent {
  id: string;
  student_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  track_name: string;
  attended_days: number;
  total_days: number;
  attendance_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number;
  overall_rating: number;
  status: string;
  report_status: string;
  certificate_status: string;
  feedback?: string | null;
  tasks: PartnerTask[];
}

interface PartnerDocument {
  id: string;
  document_type: 'certificate' | 'report';
  title: string;
  filename: string;
  mime_type: string;
  file_size: number;
  issued_at: string | null;
  student_id: string;
  student_code: string;
  student_name: string;
  track_name: string;
  download_path: string;
}

const INNOVERA_WEBSITE_URL = 'https://www.innoveracorp.com/';

const emptyOverview: PartnerOverview = {
  organization_name: 'El Sewedy University',
  program_name: 'Innovera x El Sewedy University Internship Program',
  program_period: 'September – October 2026',
  program_status: 'Live performance view',
  total_students: 0,
  total_tracks: 2,
  attendance_percentage: 0,
  task_completion_percentage: 0,
  average_performance: 0,
  reports_pending: 0,
  certificates_issued: 0,
};

const formatStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const PartnerMark = () => (
  <div className="partner-brand-lockup">
    <div className="partner-university-logo-wrap"><img src="/assets/SWEDY.png" alt="SUTECH El Sewedy University" className="partner-university-logo" /></div>
    <span className="partner-brand-divider">×</span>
    <img src="/assets/innovera_official_logo.png" alt="Innovera" className="partner-innovera-logo" />
  </div>
);

const KpiCard = ({ label, value, helper, tone }: { label: string; value: string | number; helper: string; tone: string }) => (
  <article className={`partner-kpi-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{helper}</small>
  </article>
);

const TrackCard = ({ track, count, onOpen }: { track: string; count: number; onOpen: () => void }) => (
  <button className="partner-track-card" type="button" onClick={onOpen}>
    <div className="partner-track-number">{track === 'Software Engineering' ? '01' : '02'}</div>
    <div className="partner-track-card-body"><h3>{track}</h3><p>Live performance, attendance, and deliverable visibility for this track.</p><div className="partner-track-meta"><span><Users size={15} /> {count} students</span><span className="partner-badge">Partner scope</span></div></div>
    <ChevronRight size={19} />
  </button>
);

const normalizeTaskScore = (value?: number) => Math.min(10, Math.max(0, Number(value) || 0));

const formatTaskScore = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

const TaskRatingMetric = ({ label, value, tone }: { label: string; value?: number; tone: 'blue' | 'teal' | 'violet' }) => {
  const score = normalizeTaskScore(value);

  return (
    <div className={`partner-task-rating ${tone}`}>
      <div className="partner-task-rating-top"><span>{label}</span><strong>{formatTaskScore(score)}<small>/10</small></strong></div>
      <div className="partner-task-rating-bar" role="progressbar" aria-label={`${label} rating`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={score}><span style={{ width: `${score * 10}%` }} /></div>
    </div>
  );
};

const TaskEvidenceCard = ({ task, index }: { task: PartnerTask; index: number }) => {
  const scores = [task.communication_rating, task.quality_rating, task.teamwork_rating].map(normalizeTaskScore);
  const average = scores.reduce((total, score) => total + score, 0) / scores.length;

  return (
    <article className="partner-task-card">
      <header className="partner-task-card-header">
        <span className="partner-task-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className="partner-task-heading"><span>Deliverable {index + 1}</span><h4>{task.title}</h4></div>
        <div className="partner-task-average"><small>Task average</small><strong>{formatTaskScore(average)}<span>/10</span></strong></div>
      </header>

      {task.note && <div className="partner-task-note"><MessageSquareText size={16} /><div><span>Evaluator note</span><p>{task.note}</p></div></div>}

      {task.submission_link && <a className="partner-task-link" href={task.submission_link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open submission evidence</a>}

      <div className="partner-task-rating-grid">
        <TaskRatingMetric label="Communication" value={task.communication_rating} tone="blue" />
        <TaskRatingMetric label="Task quality" value={task.quality_rating} tone="teal" />
        <TaskRatingMetric label="Teamwork" value={task.teamwork_rating} tone="violet" />
      </div>
    </article>
  );
};

const StudentProfilePanel = ({ student, onClose }: { student: PartnerStudent; onClose: () => void }) => (
  <aside className="partner-profile-panel">
    <div className="partner-profile-header"><div><span className="partner-eyebrow">Read-only student profile</span><h2>{student.full_name}</h2></div><button className="partner-icon-button" type="button" onClick={onClose} aria-label="Close profile"><X size={19} /></button></div>
    <div className="partner-profile-code">{student.student_code} · {student.track_name}</div>
    <div className="partner-profile-summary"><div><span>Track</span><strong>{student.track_name}</strong></div><div><span>Status</span><strong>{formatStatus(student.status)}</strong></div></div>
    <div className="partner-profile-metrics"><div><span>Attendance</span><strong>{student.attendance_percentage}%</strong><small>{student.attended_days}/{student.total_days || 0} days</small></div><div><span>Progress</span><strong>{student.progress_percentage}%</strong><small>{student.completed_tasks}/{student.total_tasks || 0} tasks</small></div><div><span>Rating</span><strong>{student.overall_rating}/10</strong><small>Overall performance</small></div></div>
    <dl className="partner-profile-details"><div><dt>Email</dt><dd>{student.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{student.phone || 'Not provided'}</dd></div><div><dt>Report</dt><dd>{formatStatus(student.report_status)}</dd></div><div><dt>Certificate</dt><dd>{formatStatus(student.certificate_status)}</dd></div></dl>
    {student.feedback && <div className="partner-profile-note"><ShieldCheck size={17} /><span>{student.feedback}</span></div>}
    <section className="partner-profile-tasks" aria-labelledby="partner-tasks-heading"><div className="partner-section-header"><div><span className="partner-eyebrow">Evaluation evidence</span><h3 id="partner-tasks-heading">Tasks & ratings</h3><p>Detailed assessment for each submitted deliverable.</p></div><span className="partner-task-count">{student.tasks.length} {student.tasks.length === 1 ? 'task' : 'tasks'}</span></div>{student.tasks.length ? <div className="partner-task-list">{student.tasks.map((task, index) => <TaskEvidenceCard key={task.id || `${task.title}-${index}`} task={task} index={index} />)}</div> : <p className="partner-muted-copy">No task evaluations have been recorded yet.</p>}</section>
  </aside>
);

const ElSewedyPortal = () => {
  const { user, logout } = usePartnerAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PortalTab>('overview');
  const [activeTrack, setActiveTrack] = useState<TrackFilter>('All');
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState<PartnerOverview>(emptyOverview);
  const [students, setStudents] = useState<PartnerStudent[]>([]);
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<PartnerStudent | null>(null);

  const loadData = async () => {
    setError('');
    try {
      const [overviewResponse, studentsResponse, documentsResponse] = await Promise.all([
        partnerApi.get('/partners/elswedy/overview'),
        partnerApi.get('/partners/elswedy/students'),
        partnerApi.get('/partners/elswedy/documents'),
      ]);
      setOverview(overviewResponse.data?.data || emptyOverview);
      setStudents(studentsResponse.data?.data?.students || []);
      setDocuments(documentsResponse.data?.data?.documents || []);
    } catch (loadError: any) {
      setError(loadError.response?.data?.detail || 'The partner workspace could not load its data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchesTrack = activeTrack === 'All' || student.track_name === activeTrack;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [student.full_name, student.student_code, student.email || ''].some((field) => field.toLowerCase().includes(query));
    return matchesTrack && matchesSearch;
  }), [activeTrack, search, students]);

  const handleLogout = () => { logout(); navigate('/partners/elswedy/login', { replace: true }); };
  const openDirectory = (track: TrackFilter = 'All') => { setActiveTrack(track); setTab('directory'); };

  if (loading) return <div className="partner-loading-screen"><div className="partner-loading-mark">ESU</div><span>Preparing the private partner workspace…</span></div>;

  return (
    <div className="partner-portal-shell">
      <header className="partner-topbar"><PartnerMark /><div className="partner-topbar-right"><span className="partner-secure-chip"><ShieldCheck size={15} /> Read-only partner access</span><div className="partner-user-menu"><div className="partner-user-avatar">{user?.first_name?.charAt(0) || 'E'}</div><div><strong>{user?.first_name} {user?.last_name}</strong><span>El Sewedy University</span></div></div><button className="partner-logout-button" type="button" onClick={handleLogout}><LogOut size={16} /> Sign out</button></div></header>
      <main className="partner-main-content">
        <div className="partner-page-heading"><div><span className="partner-eyebrow">El Sewedy University · Partner workspace</span><h1>{overview.program_name}</h1><p>{overview.program_period} <span className="partner-heading-dot">•</span> <span className="partner-status-inline"><span /> {overview.program_status}</span></p></div></div>
        <nav className="partner-tab-nav" aria-label="Partner workspace sections">{([['overview', 'Program Overview', BarChart3], ['cohorts', 'Tracks', Users], ['directory', 'Student Directory', Users], ['reports', 'Reports & Documents', FileText]] as const).map(([key, label, Icon]) => <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={17} /> {label}</button>)}</nav>
        {error && <div className="partner-alert partner-alert-page" role="alert"><ShieldCheck size={18} /><span>{error}</span><button type="button" onClick={() => void loadData()}>Retry</button></div>}

        {tab === 'overview' && <>
          <section className="partner-hero-card"><div><span className="partner-eyebrow">Program command center</span><h2>Your university’s performance view.</h2><p>Review the latest student progress, attendance, task evaluations, and official deliverables from one controlled workspace.</p><div className="partner-hero-pills"><span><CheckCircle2 size={15} /> Software Engineering</span><span><CheckCircle2 size={15} /> Artificial Intelligence</span><span><CalendarDays size={15} /> September – October 2026</span></div></div><div className="partner-hero-art"><div className="partner-orbit orbit-one" /><div className="partner-orbit orbit-two" /><div className="partner-hero-seal"><Sparkles size={25} /><span>ESU<br /><small>LIVE VIEW</small></span></div></div></section>
          <section className="partner-kpi-grid"><KpiCard label="Total students" value={overview.total_students} helper="El Sewedy records only" tone="blue" /><KpiCard label="Tracks" value={overview.total_tracks} helper="Software · AI" tone="violet" /><KpiCard label="Attendance" value={`${overview.attendance_percentage}%`} helper="Average attendance" tone="green" /><KpiCard label="Task completion" value={`${overview.task_completion_percentage}%`} helper="Deliverables completed" tone="amber" /><KpiCard label="Performance" value={`${overview.average_performance}/10`} helper="Average rating" tone="pink" /><KpiCard label="Reports pending" value={overview.reports_pending} helper="Awaiting review" tone="orange" /><KpiCard label="Certificates" value={overview.certificates_issued} helper="Officially issued" tone="indigo" /></section>
          <section className="partner-section-header"><div><span className="partner-eyebrow">Program structure</span><h2>Tracks in your workspace</h2></div><button className="partner-text-button" type="button" onClick={() => setTab('cohorts')}>View tracks <ChevronRight size={16} /></button></section>
          <section className="partner-track-grid">{TRACKS.map((track) => <TrackCard key={track} track={track} count={students.filter((student) => student.track_name === track).length} onOpen={() => openDirectory(track)} />)}</section>
        </>}

        {tab === 'cohorts' && <section className="partner-content-card"><div className="partner-section-header"><div><span className="partner-eyebrow">Track performance</span><h2>Explore approved tracks</h2><p>Switch between Software Engineering and Artificial Intelligence. All records are read-only and sourced from Innovera.</p></div></div><div className="partner-filter-row"><div className="partner-filter-label">Track</div><div className="partner-segmented">{(['All', ...TRACKS] as TrackFilter[]).map((track) => <button key={track} className={activeTrack === track ? 'active' : ''} type="button" onClick={() => setActiveTrack(track)}>{track === 'All' ? 'All tracks' : track}</button>)}</div></div><div className="partner-cohort-summary"><div><strong>{filteredStudents.length}</strong><span>students in current view</span></div><div><strong>{activeTrack === 'All' ? '2' : '1'}</strong><span>track{activeTrack === 'All' ? 's' : ''}</span></div><div><strong>Live</strong><span>source of truth</span></div></div>{filteredStudents.length ? <StudentTable students={filteredStudents} onSelect={setSelectedStudent} /> : <EmptyState title="No students in this track yet" body="Students assigned to El Sewedy from the Innovera dashboard will appear here automatically." />}</section>}

        {tab === 'directory' && <section className="partner-content-card"><div className="partner-section-header"><div><span className="partner-eyebrow">Controlled directory</span><h2>Student directory</h2><p>Only El Sewedy records are listed here. The directory updates from the main Innovera dashboard.</p></div></div><div className="partner-directory-toolbar"><div className="partner-search-wrap"><Search size={17} /><input aria-label="Search partner students" placeholder="Search by name, code, or email" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="partner-toolbar-count">{filteredStudents.length} of {students.length} records</div></div><div className="partner-directory-filters"><div className="partner-segmented">{(['All', ...TRACKS] as TrackFilter[]).map((track) => <button key={track} className={activeTrack === track ? 'active' : ''} type="button" onClick={() => setActiveTrack(track)}>{track === 'All' ? 'All tracks' : track}</button>)}</div></div>{filteredStudents.length ? <StudentTable students={filteredStudents} onSelect={setSelectedStudent} /> : <EmptyState title={students.length ? 'No students match these filters' : 'Your student directory is ready'} body={students.length ? 'Try another track or search term.' : 'Students added from the main Innovera dashboard will appear automatically.'} />}</section>}

        {tab === 'reports' && <ReportsSection documents={documents} />}
      </main>
      <footer className="partner-footer"><span>{overview.program_name}</span><a className="partner-powered-by" href={INNOVERA_WEBSITE_URL} target="_blank" rel="noreferrer">Powered by Innovera</a><span><ShieldCheck size={14} /> Private read-only workspace</span></footer>
      {selectedStudent && <div className="partner-profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedStudent(null); }}><StudentProfilePanel student={selectedStudent} onClose={() => setSelectedStudent(null)} /></div>}
    </div>
  );
};

const StudentTable = ({ students, onSelect }: { students: PartnerStudent[]; onSelect: (student: PartnerStudent) => void }) => (
  <div className="partner-table-wrap"><table className="partner-student-table"><thead><tr><th>Student</th><th>Student ID</th><th>Track</th><th>Attendance</th><th>Progress</th><th>Rating</th><th>Report</th><th>Certificate</th></tr></thead><tbody>{students.map((student) => <tr key={student.id} onClick={() => onSelect(student)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(student); }}><td><strong>{student.full_name}</strong><span>{student.email || 'Email not provided'}</span></td><td>{student.student_code}</td><td><strong>{student.track_name}</strong></td><td><strong>{student.attendance_percentage}%</strong><span>{student.attended_days}/{student.total_days || 0} days</span></td><td><div className="partner-progress"><span style={{ width: `${Math.min(student.progress_percentage, 100)}%` }} /></div><small>{student.progress_percentage}%</small></td><td><strong>{student.overall_rating}/10</strong><span>Overall</span></td><td><span className="partner-status-badge">{formatStatus(student.report_status)}</span></td><td><span className={`partner-status-badge ${student.certificate_status === 'issued' ? 'success' : ''}`}>{formatStatus(student.certificate_status)}</span></td></tr>)}</tbody></table></div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => <div className="partner-empty-state"><div className="partner-empty-icon"><Users size={22} /></div><h3>{title}</h3><p>{body}</p></div>;

const formatDocumentDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : 'Date not available';

const DocumentRow = ({ document }: { document: PartnerDocument }) => {
  const [busyAction, setBusyAction] = useState<'preview' | 'download' | null>(null);
  const [error, setError] = useState('');

  const openDocument = async (action: 'preview' | 'download') => {
    setBusyAction(action);
    setError('');
    try {
      const response = await partnerApi.get(document.download_path, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      if (action === 'preview') {
        const previewWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
        if (!previewWindow) throw new Error('Popup blocked');
      } else {
        const anchor = window.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = document.filename;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError(action === 'preview' ? 'Preview is unavailable right now.' : 'Download failed. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <article className="partner-issued-document">
      <div className={`partner-issued-document-icon ${document.document_type}`} aria-hidden="true">
        {document.document_type === 'certificate' ? <Award size={19} /> : <FileText size={19} />}
      </div>
      <div className="partner-issued-document-body">
        <div className="partner-issued-document-heading"><div><h4>{document.student_name}</h4><p>{document.title}</p></div><span className="partner-document-issued"><CheckCircle2 size={13} /> Issued</span></div>
        <div className="partner-issued-document-meta"><span>{document.student_code}</span><span>{document.track_name}</span><span>{formatDocumentDate(document.issued_at)}</span></div>
        {error && <p className="partner-document-error" role="status">{error}</p>}
        <div className="partner-issued-document-actions">
          <button type="button" className="partner-document-action" onClick={() => void openDocument('preview')} disabled={busyAction !== null}><ExternalLink size={14} /> {busyAction === 'preview' ? 'Opening…' : 'Preview'}</button>
          <button type="button" className="partner-document-action primary" onClick={() => void openDocument('download')} disabled={busyAction !== null}><Download size={14} /> {busyAction === 'download' ? 'Preparing…' : 'Download'}</button>
        </div>
      </div>
    </article>
  );
};

const DocumentCollection = ({ type, title, description, documents }: { type: PartnerDocument['document_type']; title: string; description: string; documents: PartnerDocument[] }) => (
  <section className="partner-document-collection" aria-labelledby={`partner-${type}-heading`}>
    <div className="partner-document-collection-header"><div className={`partner-document-collection-icon ${type}`} aria-hidden="true">{type === 'certificate' ? <Award size={20} /> : <FileText size={20} />}</div><div><div className="partner-document-collection-title"><h3 id={`partner-${type}-heading`}>{title}</h3><span>{documents.length}</span></div><p>{description}</p></div></div>
    {documents.length ? <div className="partner-issued-document-list">{documents.map((document) => <DocumentRow key={document.id} document={document} />)}</div> : <div className="partner-document-empty"><div className="partner-document-empty-icon">{type === 'certificate' ? <Award size={18} /> : <FileText size={18} />}</div><strong>No {type === 'certificate' ? 'certificates' : 'reports'} issued yet</strong><p>Documents generated for El Sewedy students from the main Innovera dashboard will appear here automatically.</p></div>}
  </section>
);

const ReportsSection = ({ documents }: { documents: PartnerDocument[] }) => {
  const availableDocuments = documents || [];
  const certificates = availableDocuments.filter((document) => document.document_type === 'certificate');
  const reports = availableDocuments.filter((document) => document.document_type === 'report');

  return <section className="partner-content-card"><div className="partner-section-header"><div><span className="partner-eyebrow">Official deliverables</span><h2>Reports & documents</h2><p>Only issued documents belonging to El Sewedy students are available in this private workspace.</p></div></div><div className="partner-document-collections"><DocumentCollection type="certificate" title="Certificates" description="Official certificates generated for eligible students." documents={certificates} /><DocumentCollection type="report" title="Reports" description="Official internship evaluation reports for your records." documents={reports} /></div><div className="partner-branding-preview"><div className="partner-branding-preview-copy"><span className="partner-eyebrow">Shared document identity</span><h3>Innovera x El Sewedy University</h3><p>Issued documents use the approved partner scope, official branding, reference number, and verification details.</p></div><div className="partner-branding-preview-logos"><div className="partner-mark partner-mark-elswedy">ESU</div><span>x</span><img src="/assets/innovera_official_logo.png" alt="Innovera" className="partner-innovera-logo" /></div></div></section>;
};

export default ElSewedyPortal;
