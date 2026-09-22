import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CalendarDays, ChevronLeft, ChevronRight, FileText, Search, ShieldCheck } from 'lucide-react';
import {
  getCertificateIssuanceHistory,
  type CertificateIssuanceListItem,
  type CertificateProgramType,
} from '../../frontend/src/services/certificateAudit';

type RegistryTab = 'intern' | 'student';

const formatIssuedAt = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(new Date(value));

const tabCopy: Record<RegistryTab, { label: string; description: string; empty: string }> = {
  intern: {
    label: 'Intern Certificates',
    description: 'Official certificate downloads issued for internship students.',
    empty: 'No internship certificate records match the current filters.',
  },
  student: {
    label: 'Course Certificates',
    description: 'Official certificate downloads issued for course students.',
    empty: 'No course certificate records match the current filters.',
  },
};

const CertificateRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<RegistryTab>('intern');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [issuedFrom, setIssuedFrom] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<CertificateIssuanceListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCertificateIssuanceHistory({
          programType: tab as CertificateProgramType,
          page,
          search,
          issuedFrom,
          issuedTo,
        });
        if (active) {
          setRecords(result.data);
          setMeta(result.meta);
        }
      } catch (requestError) {
        console.error('Certificate registry could not be loaded.', requestError);
        if (active) {
          setRecords([]);
          setError('The certificate registry could not be loaded. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [tab, page, search, issuedFrom, issuedTo]);

  const selectTab = (nextTab: RegistryTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setIssuedFrom('');
    setIssuedTo('');
    setPage(1);
  };

  const openStudent = (record: CertificateIssuanceListItem) => {
    if (!record.student_id) return;
    navigate(tab === 'intern' ? `/admin/users/${record.student_id}` : `/admin/students/${record.student_id}`);
  };

  const hasFilters = Boolean(search || issuedFrom || issuedTo);

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--secondary-color)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em' }}>AUDIT & COMPLIANCE</p>
          <h1 style={{ margin: '0.35rem 0', color: 'var(--text-main)', fontSize: '1.8rem' }}>Certificate Issuance History</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Immutable record of certificate downloads issued from the platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '0.65rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} color="#10B981" aria-hidden="true" />
          Admin-only audit register
        </div>
      </div>

      <section className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }} role="tablist" aria-label="Certificate program type">
          {(Object.keys(tabCopy) as RegistryTab[]).map((entry) => {
            const active = tab === entry;
            return (
              <button
                key={entry}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(entry)}
                style={{ border: 'none', cursor: 'pointer', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', fontWeight: 700, color: active ? '#FFFFFF' : 'var(--text-muted)', background: active ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'var(--bg-surface)' }}
              >
                {entry === 'intern' ? <Award size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }} aria-hidden="true" /> : <FileText size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }} aria-hidden="true" />}
                {tabCopy[entry].label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>{tabCopy[tab].label}</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tabCopy[tab].description}</p>
          </div>
          <span style={{ color: 'var(--secondary-color)', fontWeight: 700, fontSize: '0.85rem' }}>{meta.total} record{meta.total === 1 ? '' : 's'}</span>
        </div>

        <form onSubmit={submitSearch} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.6fr) minmax(150px, 0.7fr) minmax(150px, 0.7fr) auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            Search student, code, or track
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
              <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="e.g. Ahmed, INV-2026, AI" style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.75rem 0.7rem 2.25rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          </label>
          <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            Issued from
            <input type="date" value={issuedFrom} onChange={(event) => { setIssuedFrom(event.target.value); setPage(1); }} style={{ padding: '0.7rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
          </label>
          <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            Issued to
            <input type="date" value={issuedTo} onChange={(event) => { setIssuedTo(event.target.value); setPage(1); }} style={{ padding: '0.7rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={{ padding: '0.7rem 0.9rem', border: 'none', borderRadius: '0.5rem', background: '#4F46E5', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}>Apply</button>
            {hasFilters && <button type="button" onClick={clearFilters} style={{ padding: '0.7rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>}
          </div>
        </form>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.65rem' }}>
          <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Student</th><th style={{ padding: '0.85rem 1rem' }}>Track / Course</th><th style={{ padding: '0.85rem 1rem' }}>Format</th><th style={{ padding: '0.85rem 1rem' }}>Issued by</th><th style={{ padding: '0.85rem 1rem' }}>Date & time</th><th style={{ padding: '0.85rem 1rem' }} aria-label="Student profile" />
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading issuance records…</td></tr> : error ? <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--error)' }}>{error}</td></tr> : records.length === 0 ? <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{tabCopy[tab].empty}</td></tr> : records.map((record) => (
                <tr key={record.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.9rem 1rem' }}><strong style={{ color: 'var(--text-main)' }}>{record.student_name}</strong><div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{record.student_code}</div></td>
                  <td style={{ padding: '0.9rem 1rem', color: 'var(--text-main)' }}>{record.program_title}{record.training_period && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{record.training_period}</div>}{record.course_hours && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{record.course_hours} training hours</div>}</td>
                  <td style={{ padding: '0.9rem 1rem' }}><span style={{ display: 'inline-block', padding: '0.28rem 0.5rem', borderRadius: '999px', color: '#0369A1', background: 'rgba(14, 165, 233, 0.12)', fontSize: '0.75rem', fontWeight: 700 }}>{record.file_format.toUpperCase()}</span></td>
                  <td style={{ padding: '0.9rem 1rem', color: 'var(--text-main)' }}>{record.issued_by_name}</td>
                  <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}><CalendarDays size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden="true" />{formatIssuedAt(record.issued_at)}</td>
                  <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}><button type="button" onClick={() => openStudent(record)} disabled={!record.student_id} style={{ border: '1px solid var(--border-color)', borderRadius: '0.4rem', padding: '0.4rem 0.6rem', background: 'transparent', color: record.student_id ? 'var(--secondary-color)' : 'var(--text-muted)', cursor: record.student_id ? 'pointer' : 'not-allowed', fontWeight: 600 }}>View student</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <span>Page {meta.page} of {meta.total_pages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" aria-label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={loading || page === 1} style={{ padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={16} /></button>
            <button type="button" aria-label="Next page" onClick={() => setPage((value) => Math.min(meta.total_pages, value + 1))} disabled={loading || page >= meta.total_pages} style={{ padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: page >= meta.total_pages ? 'not-allowed' : 'pointer' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CertificateRegistry;
