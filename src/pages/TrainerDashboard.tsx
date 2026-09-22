import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, ChevronDown, FileSpreadsheet, RefreshCw, Star, Upload, Users } from 'lucide-react';
import {
  getTrainerFeedbackAnalytics,
  importTrainerFeedbackFile,
  previewTrainerFeedbackFile,
  type RatingColumnMapping,
  type TrainerFeedbackMapping,
  type TrainerFeedbackPreview,
  type TrainerPerformanceAnalytics,
  type TrainerPerformanceItem,
} from '../services/trainerFeedback';

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.75rem', borderRadius: '0.5rem',
  background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)',
};

const formatScore = (score: number | null) => score === null ? '—' : `${score.toFixed(1)}%`;

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(new Date(value)) : 'No import yet';

const toMapping = (preview: TrainerFeedbackPreview): TrainerFeedbackMapping => ({
  trainer_column: preview.suggested_mapping.trainer_column || preview.headers[0] || '',
  submitted_at_column: preview.suggested_mapping.submitted_at_column || null,
  feedback_column: preview.suggested_mapping.feedback_column || null,
  rating_columns: preview.suggested_mapping.rating_columns || [],
});

const Metric: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode }> = ({ label, value, detail, icon }) => (
  <article className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
      <span>{label}</span>{icon}
    </div>
    <strong style={{ display: 'block', marginTop: '0.5rem', fontSize: '1.65rem', color: 'var(--text-main)' }}>{value}</strong>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{detail}</span>
  </article>
);

const TrainerDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<TrainerPerformanceAnalytics | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerPerformanceItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TrainerFeedbackPreview | null>(null);
  const [mapping, setMapping] = useState<TrainerFeedbackMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await getTrainerFeedbackAnalytics();
      setAnalytics(result);
      setSelectedTrainer((current) => result.trainers.find((trainer) => trainer.trainer_name === current?.trainer_name) || result.trainers[0] || null);
    } catch (requestError) {
      console.error('Trainer analytics could not be loaded.', requestError);
      setError('Trainer analytics could not be loaded. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAnalytics(); }, []);

  const chooseFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setPreview(null);
    setMapping(null);
    setMessage(null);
    setError(null);
    if (!nextFile) return;
    setUploading(true);
    try {
      const result = await previewTrainerFeedbackFile(nextFile);
      setPreview(result);
      setMapping(toMapping(result));
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'The file could not be read. Upload an Excel (.xlsx) or UTF-8 CSV export.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const updateRating = (column: string, checked: boolean) => {
    setMapping((current) => {
      if (!current) return current;
      const existing = current.rating_columns.find((item) => item.column === column);
      const rating_columns: RatingColumnMapping[] = checked
        ? [...current.rating_columns, { column, max_score: null }]
        : current.rating_columns.filter((item) => item.column !== column);
      return { ...current, rating_columns: existing && checked ? current.rating_columns : rating_columns };
    });
  };

  const importFile = async () => {
    if (!file || !mapping || !preview) return;
    if (!mapping.trainer_column || mapping.rating_columns.length === 0) {
      setError('Select the trainer name column and at least one rating question before importing.');
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await importTrainerFeedbackFile(file, mapping);
      setMessage(result.duplicate
        ? 'This exact file was already imported, so the existing audit-safe results are being used.'
        : `Imported ${result.imported_rows} responses${result.skipped_rows ? `; skipped ${result.skipped_rows} rows without a trainer name.` : '.'}`);
      setFile(null);
      setPreview(null);
      setMapping(null);
      await loadAnalytics();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'The feedback file could not be imported. No partial import was saved.');
    } finally {
      setUploading(false);
    }
  };

  const ratingColumns = useMemo(() => new Set(mapping?.rating_columns.map((item) => item.column) || []), [mapping]);

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 800 }}>PEOPLE PERFORMANCE</p>
          <h1 style={{ margin: '0.35rem 0', color: 'var(--text-main)', fontSize: '1.85rem' }}>Trainer Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Microsoft Forms feedback, normalized scoring, and transparent trainer ranking.</p>
        </div>
        <button type="button" onClick={() => void loadAnalytics()} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      <section className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }} aria-labelledby="feedback-upload-title">
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
          <div style={{ padding: '0.6rem', borderRadius: '0.55rem', background: 'rgba(79, 70, 229, 0.12)', color: '#818CF8' }}><FileSpreadsheet size={20} aria-hidden="true" /></div>
          <div style={{ flex: 1 }}>
            <h2 id="feedback-upload-title" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Import Microsoft Forms feedback</h2>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>Upload an Excel export (.xlsx) or UTF-8 CSV. Review the detected columns before the platform saves any response.</p>
          </div>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', background: '#4F46E5', color: '#FFFFFF', cursor: uploading ? 'wait' : 'pointer', fontWeight: 700 }}>
          <Upload size={16} aria-hidden="true" /> {uploading ? 'Reading file…' : 'Choose feedback file'}
          <input type="file" accept=".xlsx,.csv" onChange={(event) => void chooseFile(event.target.files?.[0] || null)} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {message && <p style={{ margin: '0.9rem 0 0', color: '#059669', fontSize: '0.84rem' }}><CheckCircle2 size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden="true" />{message}</p>}
        {error && <p role="alert" style={{ margin: '0.9rem 0 0', color: '#DC2626', fontSize: '0.84rem' }}>{error}</p>}

        {preview && mapping && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--text-main)' }}>Review import mapping</strong>
            <p style={{ margin: '0.3rem 0 0.9rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{preview.row_count} response rows found in {preview.filename}{preview.worksheet_name ? ` · ${preview.worksheet_name}` : ''}. Suggested fields can be changed before import.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>Trainer name *
                <select value={mapping.trainer_column} onChange={(event) => setMapping({ ...mapping, trainer_column: event.target.value })} style={fieldStyle}>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select>
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>Response date (optional)
                <select value={mapping.submitted_at_column || ''} onChange={(event) => setMapping({ ...mapping, submitted_at_column: event.target.value || null })} style={fieldStyle}><option value="">Not imported</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select>
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>Written feedback (optional)
                <select value={mapping.feedback_column || ''} onChange={(event) => setMapping({ ...mapping, feedback_column: event.target.value || null })} style={fieldStyle}><option value="">Not imported</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select>
              </label>
            </div>
            <fieldset style={{ margin: '1rem 0 0', border: '1px solid var(--border-color)', borderRadius: '0.55rem', padding: '0.85rem' }}>
              <legend style={{ padding: '0 0.35rem', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 800 }}>Rating questions *</legend>
              <p style={{ margin: '0 0 0.7rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Choose only evaluation questions. Each score is converted to a percentage from its selected scale.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: '0.6rem' }}>
                {preview.headers.map((header) => {
                  const selected = ratingColumns.has(header);
                  const rating = mapping.rating_columns.find((item) => item.column === header);
                  return <div key={header} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0, color: 'var(--text-main)', fontSize: '0.8rem' }}><input type="checkbox" checked={selected} onChange={(event) => updateRating(header, event.target.checked)} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</span></label>
                    {selected && <select aria-label={`Scale for ${header}`} value={rating?.max_score || ''} onChange={(event) => setMapping({ ...mapping, rating_columns: mapping.rating_columns.map((item) => item.column === header ? { ...item, max_score: event.target.value ? Number(event.target.value) : null } : item) })} style={{ ...fieldStyle, width: 104, padding: '0.4rem' }}><option value="">Auto</option><option value="5">/ 5</option><option value="10">/ 10</option><option value="100">/ 100</option></select>}
                  </div>;
                })}
              </div>
            </fieldset>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}><button type="button" onClick={() => void importFile()} disabled={uploading} style={{ padding: '0.7rem 1rem', border: 'none', borderRadius: '0.5rem', cursor: uploading ? 'wait' : 'pointer', fontWeight: 800, background: '#10B981', color: '#FFFFFF' }}>Confirm & import {preview.row_count} responses</button></div>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <Metric label="TRAINERS EVALUATED" value={String(analytics?.total_trainers ?? 0)} detail="Named trainers in approved imports" icon={<Users size={18} aria-hidden="true" />} />
        <Metric label="VALID RESPONSES" value={String(analytics?.total_responses ?? 0)} detail="Every response remains traceable to its import" icon={<FileSpreadsheet size={18} aria-hidden="true" />} />
        <Metric label="WEIGHTED AVERAGE" value={formatScore(analytics?.overall_score ?? null)} detail={`Last import: ${formatDate(analytics?.latest_import_at ?? null)}`} icon={<BarChart3 size={18} aria-hidden="true" />} />
      </section>

      <section className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1rem' }}><div><h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Trainer ranking</h2><p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Ranking is based on response-weighted normalized scores; confidence reflects the number of responses.</p></div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Click a trainer to view evaluation evidence</span></div>
        {loading ? <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading trainer performance…</p> : !analytics?.trainers.length ? <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No feedback has been imported yet. Upload a Microsoft Forms export to create the first ranking.</p> : <>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.6rem' }}><table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.04em' }}><th style={{ padding: '0.8rem' }}>RANK</th><th style={{ padding: '0.8rem' }}>TRAINER</th><th style={{ padding: '0.8rem' }}>FINAL RESULT</th><th style={{ padding: '0.8rem' }}>RESPONSES</th><th style={{ padding: '0.8rem' }}>CONFIDENCE</th><th style={{ padding: '0.8rem' }}>STATUS</th><th style={{ padding: '0.8rem' }} /></tr></thead><tbody>{analytics.trainers.map((trainer) => <tr key={trainer.trainer_name} style={{ borderTop: '1px solid var(--border-color)' }}><td style={{ padding: '0.85rem', color: 'var(--secondary-color)', fontWeight: 800 }}>#{trainer.rank}</td><td style={{ padding: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>{trainer.trainer_name}</td><td style={{ padding: '0.85rem', color: 'var(--text-main)', fontWeight: 800 }}>{formatScore(trainer.overall_score)}</td><td style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>{trainer.response_count}</td><td style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>{trainer.confidence}</td><td style={{ padding: '0.85rem' }}><span style={{ color: trainer.status === 'Needs attention' ? '#DC2626' : '#059669', fontSize: '0.78rem', fontWeight: 700 }}>{trainer.status}</span></td><td style={{ padding: '0.85rem', textAlign: 'right' }}><button type="button" onClick={() => setSelectedTrainer(trainer)} style={{ border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '0.4rem', padding: '0.4rem 0.55rem', color: 'var(--secondary-color)', cursor: 'pointer', fontWeight: 700 }}>View</button></td></tr>)}</tbody></table></div>
          {selectedTrainer && <article style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '0.6rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}><div><p style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em' }}>TRAINER EVALUATION EVIDENCE</p><h3 style={{ margin: '0.3rem 0', color: 'var(--text-main)' }}>{selectedTrainer.trainer_name}</h3><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{selectedTrainer.response_count} responses · {selectedTrainer.feedback_count} written comments · {selectedTrainer.confidence}</p></div><strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}><Star size={18} style={{ verticalAlign: 'text-bottom', color: '#F59E0B' }} aria-hidden="true" /> {formatScore(selectedTrainer.overall_score)}</strong></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginTop: '1rem' }}>{selectedTrainer.axis_scores.map((axis) => <div key={axis.name} style={{ padding: '0.7rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.76rem' }}>{axis.name}</span><strong style={{ color: 'var(--text-main)' }}>{axis.score.toFixed(1)}%</strong><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{axis.response_count} rated responses</span></div>)}</div>{selectedTrainer.recent_feedback.length > 0 && <div style={{ marginTop: '1rem' }}><strong style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Recent written feedback</strong>{selectedTrainer.recent_feedback.map((feedback, index) => <p key={`${feedback}-${index}`} style={{ margin: '0.5rem 0 0', padding: '0.65rem 0.75rem', borderLeft: '3px solid #818CF8', color: 'var(--text-muted)', fontSize: '0.84rem' }}>{feedback}</p>)}</div>}</article>}
        </>}
      </section>
    </div>
  );
};

export default TrainerDashboard;
