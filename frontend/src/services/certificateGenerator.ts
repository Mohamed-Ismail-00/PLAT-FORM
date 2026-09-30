import { jsPDF } from 'jspdf';
import { syncGeneratedPartnerDocument } from './partnerDocumentSync';
import {
  COURSE_CERTIFICATE_PDF_SIZE_MM,
  renderCourseCertificateCanvas,
} from './courseCertificateRenderer';

export type CertificateType = 'internship' | 'course';

export interface CertificateData {
  studentName: string;
  studentCode?: string;
  courseTitle: string;
  monthYear?: string;
  trainingPeriod?: string;
  certificateType?: CertificateType;
  courseHours?: number;
  dateOfIssue?: string;
}

const normalizeCourseTitle = (courseTitle: string) => courseTitle
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\bcybersecurity\b/g, 'cyber security')
  .replace(/\s+/g, ' ')
  .trim();

/** Canonical course durations used by the Course Students certificate flow. */
export const getCourseDurationHours = (courseTitle: string): number | null => {
  const normalizedTitle = normalizeCourseTitle(courseTitle);

  if (/\bcyber security program certificat(?:e)?\b/.test(normalizedTitle)) return 75;
  if (/\bcyber security fund(?:a)?mentals?\b/.test(normalizedTitle)) return 60;
  if (/\bcyber security foundation\b/.test(normalizedTitle)) return 40;
  if (/\bgame (?:dev|development)\b/.test(normalizedTitle)) return 40;

  return null;
};

const resolveCourseHours = (data: Pick<CertificateData, 'courseTitle' | 'courseHours'>) => {
  const enteredHours = Number(data.courseHours);
  if (Number.isFinite(enteredHours) && enteredHours > 0) return Math.round(enteredHours);
  return getCourseDurationHours(data.courseTitle) ?? 40;
};

const INTERNSHIP_TEMPLATE_URL = '/assets/internship_certificate_template.png';
let internshipTemplateImagePromise: Promise<HTMLImageElement> | null = null;
let internshipTemplateJpegPromise: Promise<Uint8Array> | null = null;

const loadInternshipTemplateImage = (): Promise<HTMLImageElement> => {
  if (!internshipTemplateImagePromise) {
    internshipTemplateImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load the internship certificate template.'));
      image.src = INTERNSHIP_TEMPLATE_URL;
    }).catch((error) => {
      internshipTemplateImagePromise = null;
      throw error;
    });
  }
  return internshipTemplateImagePromise;
};

const loadInternshipTemplateJpeg = (): Promise<Uint8Array> => {
  if (!internshipTemplateJpegPromise) {
    internshipTemplateJpegPromise = (async () => {
      const image = await loadInternshipTemplateImage();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to prepare the internship certificate template.');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Unable to encode the internship certificate template.'));
        }, 'image/jpeg', 0.98);
      });
      return new Uint8Array(await blob.arrayBuffer());
    })().catch((error) => {
      internshipTemplateJpegPromise = null;
      throw error;
    });
  }
  return internshipTemplateJpegPromise;
};

/** Shared wording for the live preview and both download formats. */
export const getCertificateDescription = (
  data: Pick<CertificateData, 'courseTitle' | 'monthYear' | 'trainingPeriod' | 'certificateType' | 'courseHours'>,
): [string, string] => {
  if (data.certificateType === 'course') {
    const courseTitle = data.courseTitle.replace(/\s+/g, ' ').trim() || 'Course';
    const hasCourseQualifier = /\b(course|program|certificate)\b/i.test(courseTitle);
    const courseLabel = hasCourseQualifier ? courseTitle : `${courseTitle} course`;
    return [
      `For successfully completing the ${courseLabel}`,
      `with a total duration of ${resolveCourseHours(data)} training hours`,
    ];
  }

  const track = data.courseTitle.trim() || 'AI track';
  const trackLabel = track.toLowerCase().endsWith('track') ? track : `${track} track`;
  const period = data.trainingPeriod?.replace(/\s+/g, ' ').trim();
  return period
    ? ['For completing an internship program', `${period} at Innovera in ${trackLabel}`]
    : ['For completing an internship program for the', `month of (${data.monthYear?.trim() || 'July 2026'}) at Innovera in ${trackLabel}`];
};

export const renderStudentCertificatePreview = async (
  targetCanvas: HTMLCanvasElement,
  data: CertificateData,
  shouldCommit: () => boolean = () => true,
) => {
  if (data.certificateType === 'course') {
    const renderedCanvas = await renderCourseCertificateCanvas({
      studentName: data.studentName,
      courseTitle: data.courseTitle,
      courseHours: resolveCourseHours(data),
    }, 1200);
    if (!shouldCommit()) return;
    targetCanvas.width = renderedCanvas.width;
    targetCanvas.height = renderedCanvas.height;
    const targetContext = targetCanvas.getContext('2d');
    if (!targetContext) throw new Error('Canvas context is unavailable for the certificate preview.');
    targetContext.drawImage(renderedCanvas, 0, 0);
    return;
  }

  const image = await loadInternshipTemplateImage();
  if (!shouldCommit()) return;
  targetCanvas.width = 1200;
  targetCanvas.height = Math.round(1200 * image.height / image.width);
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context is unavailable for the certificate preview.');
  ctx.drawImage(image, 0, 0, targetCanvas.width, targetCanvas.height);

  ctx.fillStyle = '#004976';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const studentName = data.studentName.trim() || 'Student Name';
  let fontSize = 48;
  if (studentName.length > 30) fontSize = 38;
  else if (studentName.length > 22) fontSize = 42;
  ctx.font = `${fontSize}px Arial, "Segoe UI", sans-serif`;
  ctx.fillText(studentName, targetCanvas.width / 2, targetCanvas.height * 0.455);

  ctx.fillStyle = '#14233C';
  ctx.font = 'bold 28px Georgia, serif';
  const [descriptionLine1, descriptionLine2] = getCertificateDescription(data);
  if (data.trainingPeriod?.trim()) {
    const widestLine = Math.max(
      ctx.measureText(descriptionLine1).width,
      ctx.measureText(descriptionLine2).width,
    );
    ctx.font = `bold ${28 * Math.min(1, targetCanvas.width * 0.84 / widestLine)}px Georgia, serif`;
  }
  ctx.fillText(descriptionLine1, targetCanvas.width / 2, targetCanvas.height * 0.556);
  ctx.fillText(descriptionLine2, targetCanvas.width / 2, targetCanvas.height * 0.592);
};

const generateCourseCertificatePDF = async (data: CertificateData) => {
  const studentName = data.studentName.trim() || 'Student Name';
  const courseTitle = data.courseTitle.trim() || 'Course';
  const canvas = await renderCourseCertificateCanvas({
    studentName,
    courseTitle,
    courseHours: resolveCourseHours(data),
  });
  const [pageWidth, pageHeight] = COURSE_CERTIFICATE_PDF_SIZE_MM;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  });
  const jpeg = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode the course certificate.'));
    }, 'image/jpeg', 0.96);
  });
  doc.addImage(new Uint8Array(await jpeg.arrayBuffer()), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  const filename = `Certificate_${studentName.replace(/\s+/g, '_')}_${data.studentCode || 'INV'}.pdf`;
  doc.save(filename);
  void syncGeneratedPartnerDocument({
    studentCode: data.studentCode || '',
    documentType: 'certificate',
    title: `${courseTitle} Certificate`,
    filename,
    blob: doc.output('blob'),
  });
  return doc;
};

export const generateStudentCertificatePDF = async (data: CertificateData) => {
  if (data.certificateType === 'course') return generateCourseCertificatePDF(data);

  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Clean strings without emojis
  const clean = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
      .replace(/[★☆]/g, '')
      .trim();
  };

  const studentName = clean(data.studentName) || 'Student Name';
  const trackName = clean(data.courseTitle) || 'AI track';
  const monthYear = clean(data.monthYear) || 'July 2026';

  // A high-quality JPEG avoids jsPDF's expensive PNG decoding while keeping
  // the approved original PNG untouched for preview and image downloads.
  doc.addImage(await loadInternshipTemplateJpeg(), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

  // 2. Draw Dynamic Student Name (Centered above the cyan line)
  doc.setTextColor(0, 73, 118); // #004976 Deep Teal Blue (matching original)
  doc.setFont('helvetica', 'normal');

  // Dynamic font sizing for student name based on length
  let nameFontSize = 30;
  if (studentName.length > 32) {
    nameFontSize = 20;
  } else if (studentName.length > 25) {
    nameFontSize = 22;
  } else if (studentName.length > 18) {
    nameFontSize = 24;
  }

  doc.setFontSize(nameFontSize);
  // Y position around 98mm in landscape A4
  doc.text(studentName, pageWidth / 2, 98.5, { align: 'center' });

  // 3. Draw Certification Description (Centered below the cyan line)
  doc.setTextColor(30, 41, 59); // #1E293B Slate 800
  doc.setFont('times', 'bold'); // Serif / Georgia Bold style
  doc.setFontSize(16);

  const [descLine1, descLine2] = getCertificateDescription({
    courseTitle: trackName,
    monthYear,
    trainingPeriod: clean(data.trainingPeriod),
    certificateType: data.certificateType,
    courseHours: data.courseHours,
  });
  if (data.certificateType === 'course' || data.trainingPeriod?.trim()) {
    const widestLine = Math.max(doc.getTextWidth(descLine1), doc.getTextWidth(descLine2));
    doc.setFontSize(Math.min(16, 16 * (pageWidth - 50) / widestLine));
  }

  doc.text(descLine1, pageWidth / 2, 118, { align: 'center' });
  doc.text(descLine2, pageWidth / 2, 125.5, { align: 'center' });

  // Save the PDF
  const filename = `Certificate_${studentName.replace(/\s+/g, '_')}_${data.studentCode || 'INV'}.pdf`;
  doc.save(filename);
  void syncGeneratedPartnerDocument({
    studentCode: data.studentCode || '',
    documentType: 'certificate',
    title: `${trackName} Certificate`,
    filename,
    blob: doc.output('blob'),
  });
  return doc;
};

/**
 * Generate a high-resolution PNG image on canvas and download it
 */
const generateCourseCertificatePNG = async (data: CertificateData): Promise<string> => {
  const studentName = data.studentName.trim() || 'Student Name';
  const canvas = await renderCourseCertificateCanvas({
    studentName,
    courseTitle: data.courseTitle.trim() || 'Course',
    courseHours: resolveCourseHours(data),
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Failed to create the course certificate image.'));
    }, 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Certificate_${studentName.replace(/\s+/g, '_')}_${data.studentCode || 'INV'}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return url;
};

export const generateStudentCertificatePNG = (data: CertificateData): Promise<string> => {
  if (data.certificateType === 'course') return generateCourseCertificatePNG(data);

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 2118;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
      // Draw background template
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const clean = (str?: string) => {
        if (!str) return '';
        return str
          .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
          .replace(/[★☆]/g, '')
          .trim();
      };

      const studentName = clean(data.studentName) || 'Student Name';
      const trackName = clean(data.courseTitle) || 'AI track';
      const monthYear = clean(data.monthYear) || 'July 2026';

      // Draw Student Name
      ctx.fillStyle = '#004976';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let nameFontSize = 120;
      if (studentName.length > 32) {
        nameFontSize = 80;
      } else if (studentName.length > 25) {
        nameFontSize = 90;
      }
      ctx.font = `${nameFontSize}px Arial, "Segoe UI", sans-serif`;
      ctx.fillText(studentName, canvas.width / 2, canvas.height * 0.455);

      // Draw Description
      ctx.fillStyle = '#14233C';
      ctx.font = 'bold 72px Georgia, serif';
      const [descLine1, descLine2] = getCertificateDescription({
        courseTitle: trackName,
        monthYear,
        trainingPeriod: clean(data.trainingPeriod),
        certificateType: data.certificateType,
        courseHours: data.courseHours,
      });
      if (data.certificateType === 'course' || data.trainingPeriod?.trim()) {
        const widestLine = Math.max(ctx.measureText(descLine1).width, ctx.measureText(descLine2).width);
        const scale = Math.min(1, canvas.width * 0.84 / widestLine);
        ctx.font = ctx.font.replace(/[\d.]+px/, (size) => `${parseFloat(size) * scale}px`);
      }

      ctx.fillText(descLine1, canvas.width / 2, canvas.height * 0.556);
      ctx.fillText(descLine2, canvas.width / 2, canvas.height * 0.592);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Certificate_${studentName.replace(/\s+/g, '_')}_${data.studentCode || 'INV'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve(url);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png');
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = INTERNSHIP_TEMPLATE_URL;
  });
};
