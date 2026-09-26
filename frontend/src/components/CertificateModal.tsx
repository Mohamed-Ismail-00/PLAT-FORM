import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Award, FileText, Image as ImageIcon, X, Check, Calendar, User } from 'lucide-react';
import {
  generateStudentCertificatePDF,
  generateStudentCertificatePNG,
  getCourseDurationHours,
  renderStudentCertificatePreview,
  type CertificateType,
} from '../services/certificateGenerator';
import { recordCertificateDownload } from '../services/certificateAudit';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentCode?: string;
  studentId?: string;
  enrollmentId?: string;
  courseTitle?: string;
  certificateType?: CertificateType;
  shouldAudit?: boolean;
  onCertificateIssued?: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  studentName: initialStudentName,
  studentCode = 'INV-2026',
  studentId,
  enrollmentId,
  courseTitle: initialCourseTitle = 'AI track',
  certificateType = 'internship',
  shouldAudit = false,
  onCertificateIssued,
}) => {
  const isCourseCertificate = certificateType === 'course';
  const [name, setName] = useState(initialStudentName || 'Student Name');
  const [track, setTrack] = useState(initialCourseTitle || 'AI track');
  const [courseHours, setCourseHours] = useState(getCourseDurationHours(initialCourseTitle) ?? 40);
  const [monthYear, setMonthYear] = useState('July 2026');
  const [trainingPeriod, setTrainingPeriod] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPng, setGeneratingPng] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      setName(initialStudentName || 'Student Name');
      setTrack(initialCourseTitle || 'AI track');
      setCourseHours(getCourseDurationHours(initialCourseTitle) ?? 40);
      setMonthYear('July 2026');
      setTrainingPeriod('');
      setToastMessage(null);
    }
  }, [isOpen, initialStudentName, initialCourseTitle, certificateType]);

  const handleCourseTitleChange = (value: string) => {
    setTrack(value);
    if (isCourseCertificate) {
      const mappedHours = getCourseDurationHours(value);
      if (mappedHours) setCourseHours(mappedHours);
    }
  };

  // Preview and downloads share one renderer so the generated file matches exactly.
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void renderStudentCertificatePreview(canvas, {
      studentName: name,
      studentCode,
      courseTitle: track,
      monthYear,
      trainingPeriod,
      certificateType,
      courseHours,
    }, () => !cancelled).catch((error) => {
      if (!cancelled) console.error('Failed to render the certificate preview:', error);
    });
    return () => { cancelled = true; };
  }, [isOpen, name, studentCode, track, monthYear, trainingPeriod, certificateType, courseHours]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generateStudentCertificatePDF({
        studentName: name,
        studentCode,
        courseTitle: track,
        monthYear,
        trainingPeriod,
        certificateType,
        courseHours,
      });
      if (shouldAudit && studentId && enrollmentId) {
        recordCertificateDownload({
          studentId,
          enrollmentId,
          certificateType,
          fileFormat: 'pdf',
          programTitle: track.trim() || initialCourseTitle,
          trainingPeriod: isCourseCertificate ? undefined : trainingPeriod.trim() || monthYear.trim(),
          courseHours: isCourseCertificate ? courseHours : undefined,
        });
        onCertificateIssued?.();
      }
      setToastMessage('Certificate PDF generated successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to generate PDF certificate:', err);
      alert('Error generating certificate PDF');
    } finally {
      setTimeout(() => setGeneratingPdf(false), 500);
    }
  };

  const handleDownloadPNG = async () => {
    setGeneratingPng(true);
    try {
      await generateStudentCertificatePNG({
        studentName: name,
        studentCode,
        courseTitle: track,
        monthYear,
        trainingPeriod,
        certificateType,
        courseHours,
      });
      if (shouldAudit && studentId && enrollmentId) {
        recordCertificateDownload({
          studentId,
          enrollmentId,
          certificateType,
          fileFormat: 'png',
          programTitle: track.trim() || initialCourseTitle,
          trainingPeriod: isCourseCertificate ? undefined : trainingPeriod.trim() || monthYear.trim(),
          courseHours: isCourseCertificate ? courseHours : undefined,
        });
        onCertificateIssued?.();
      }
      setToastMessage('Certificate Image (PNG) downloaded!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to generate PNG certificate:', err);
      alert('Error downloading certificate image');
    } finally {
      setTimeout(() => setGeneratingPng(false), 500);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '860px',
          backgroundColor: '#1E293B',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          color: '#F8FAFC',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.625rem',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Award size={22} color="#FFF" />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#34D399' }}>
                OFFICIAL RECOGNITION
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                {isCourseCertificate ? 'Course Certificate Generator' : 'Internship Certificate Generator'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94A3B8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {toastMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Check size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Certificate Live Preview Box */}
          <div
            style={{
              borderRadius: '0.75rem',
              overflow: 'hidden',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              maxHeight: '380px',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Certificate Parameters Form */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 0.8fr',
              gap: '1rem',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.35rem' }}>
                <User size={13} />
                <span>{isCourseCertificate ? 'Student Name' : 'Intern Name'}</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student Full Name"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.375rem',
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.35rem' }}>
                <Award size={13} />
                <span>{isCourseCertificate ? 'Course Name' : 'Track / Field'}</span>
              </label>
              <input
                type="text"
                value={track}
                onChange={(e) => handleCourseTitleChange(e.target.value)}
                placeholder={isCourseCertificate ? 'e.g. Game Dev' : 'e.g. AI track'}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.375rem',
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            {isCourseCertificate ? (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.35rem' }}>
                <FileText size={13} />
                <span>Training Hours</span>
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={courseHours}
                onChange={(e) => setCourseHours(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                aria-label="Course training hours"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.375rem',
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
            ) : (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.35rem' }}>
                <Calendar size={13} />
                <span>Completion Month</span>
              </label>
              <input
                type="text"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                placeholder="e.g. July 2026"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.375rem',
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
            )}
          </div>
        {!isCourseCertificate && <div>
          <label htmlFor="certificate-training-period" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.35rem' }}>
            Custom Training Period (optional)
          </label>
          <input
            id="certificate-training-period"
            type="text"
            value={trainingPeriod}
            onChange={(e) => setTrainingPeriod(e.target.value)}
            maxLength={120}
            placeholder="e.g. for 2 months of July & August"
            aria-describedby="certificate-training-period-help"
            style={{
              width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
              background: '#0F172A', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFF', fontSize: '0.875rem',
            }}
          />
          <p id="certificate-training-period-help" style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.4rem' }}>
            Replaces the month wording in this certificate. Leave blank to use Completion Month.
          </p>
        </div>}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Official Innovera Academy Template & Seal included.
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={generatingPng}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '0.5rem',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: generatingPng ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s',
              }}
            >
              <ImageIcon size={16} />
              <span>{generatingPng ? 'Exporting...' : 'Download Image (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: generatingPdf ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s',
              }}
            >
              <Award size={17} />
              <span>{generatingPdf ? 'Generating...' : 'Download Certificate (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
