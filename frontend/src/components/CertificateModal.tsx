import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Award, Download, FileText, Image as ImageIcon, X, Check, Calendar, User, Sparkles } from 'lucide-react';
import { generateStudentCertificatePDF, generateStudentCertificatePNG, CERTIFICATE_TEMPLATE_B64 } from '../services/certificateGenerator';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentCode?: string;
  courseTitle?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  studentName: initialStudentName,
  studentCode = 'INV-2026',
  courseTitle: initialCourseTitle = 'AI track',
}) => {
  const [name, setName] = useState(initialStudentName || 'Student Name');
  const [track, setTrack] = useState(initialCourseTitle || 'AI track');
  const [monthYear, setMonthYear] = useState('July 2026');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPng, setGeneratingPng] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      setName(initialStudentName || 'Student Name');
      setTrack(initialCourseTitle || 'AI track');
      setMonthYear('July 2026');
      setToastMessage(null);
    }
  }, [isOpen, initialStudentName, initialCourseTitle]);

  // Live Canvas Preview
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = CERTIFICATE_TEMPLATE_B64;
    img.onload = () => {
      canvas.width = 1200;
      canvas.height = Math.round(1200 * (img.height / img.width));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw Student Name
      ctx.fillStyle = '#004976';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const sName = name.trim() || 'Student Name';
      let fontSize = 48;
      if (sName.length > 30) fontSize = 38;
      else if (sName.length > 22) fontSize = 42;

      ctx.font = `${fontSize}px Arial, "Segoe UI", sans-serif`;
      ctx.fillText(sName, canvas.width / 2, canvas.height * 0.455);

      // Draw Description
      ctx.fillStyle = '#14233C';
      ctx.font = 'bold 28px Georgia, serif';
      const cleanTrack = track.trim().toLowerCase().endsWith('track') ? track.trim() : `${track.trim()} track`;
      const desc1 = 'For completing an internship program for the';
      const desc2 = `month of (${monthYear.trim() || 'July 2026'}) at Innovera in ${cleanTrack}`;

      ctx.fillText(desc1, canvas.width / 2, canvas.height * 0.556);
      ctx.fillText(desc2, canvas.width / 2, canvas.height * 0.592);
    };
  }, [isOpen, name, track, monthYear]);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    setGeneratingPdf(true);
    try {
      generateStudentCertificatePDF({
        studentName: name,
        studentCode,
        courseTitle: track,
        monthYear,
      });
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
      });
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
                Internship Certificate Generator
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
              gridTemplateColumns: '1.2fr 1fr 1fr',
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
                <span>Intern Name</span>
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
                <span>Track / Field</span>
              </label>
              <input
                type="text"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="e.g. AI track"
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
          </div>
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
