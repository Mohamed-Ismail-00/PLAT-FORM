import { jsPDF } from 'jspdf';
import { averageTaskRating, normalizeTaskRatings, TASK_RATING_MAX } from '../utils/taskRatings';
import { syncGeneratedPartnerDocument } from './partnerDocumentSync';

export interface ReportTaskItem {
  id?: string;
  title: string;
  submission_link?: string;
  note?: string;
  rating_scale?: number;
  communication_rating: number;
  quality_rating: number;
  teamwork_rating: number;
  created_at?: string;
}

export interface ReportData {
  studentName: string;
  studentCode: string;
  courseTitle: string;
  overallScore: number | string;
  classification: string;
  attendedDays: number;
  totalDays: number;
  tasks: ReportTaskItem[];
  feedback?: string;
  feedbackUpdatedAt?: string;
  attendanceRate?: number;
  phone?: string;
  personalEmail?: string;
}

export interface ReportGenerationOptions {
  autoSave?: boolean;
  filename?: string;
}

const OFFICIAL_LOGO_URL = '/assets/innovera_official_logo.png';
const OFFICIAL_APPROVALS_URL = '/assets/official_approvals.png';
const INK = [29, 39, 50] as const;
const MUTED = [91, 103, 115] as const;
const RULE = [207, 215, 222] as const;
const PALE = [247, 249, 250] as const;

const loadImageDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Unable to load report asset: ${url}`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
};

/** The approved source strip contains two signatures. Crop only the approved
 * Maha and seal regions without recolouring or changing the original asset. */
const cropApproval = async (
  source: string,
  region: { x: number; y: number; width: number; height: number },
): Promise<string> => {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * region.width);
  canvas.height = Math.round(image.naturalHeight * region.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare official report approvals.');
  context.drawImage(
    image,
    Math.round(image.naturalWidth * region.x),
    Math.round(image.naturalHeight * region.y),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL('image/png');
};

const cleanText = (value?: string): string => (value || '')
  .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
  .trim();

const safeFilenamePart = (value: string, fallback: string): string => cleanText(value)
  .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
  .replace(/\s+/g, '_')
  .replace(/[. ]+$/g, '')
  .slice(0, 80) || fallback;

const formatReportDate = (): string => new Date().toLocaleDateString('en-GB', {
  day: '2-digit', month: 'long', year: 'numeric',
});

type Color = readonly [number, number, number];
type TaskLine = { text: string; kind: 'title' | 'note'; height: number };

export const generateStudentPDFReport = async (
  data: ReportData,
  options: ReportGenerationOptions = {},
): Promise<jsPDF> => {
  const [officialLogo, approvalsSource] = await Promise.all([
    loadImageDataUrl(OFFICIAL_LOGO_URL),
    loadImageDataUrl(OFFICIAL_APPROVALS_URL),
  ]);
  const [mahaApproval, officialSeal] = await Promise.all([
    cropApproval(approvalsSource, { x: 0, y: 0, width: 0.35, height: 0.72 }),
    cropApproval(approvalsSource, { x: 0.385, y: 0.17, width: 0.22, height: 0.77 }),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const contentBottom = 273;
  let y = 16;

  const textColor = (color: Color) => doc.setTextColor(...color);
  const drawColor = (color: Color) => doc.setDrawColor(...color);
  const fillColor = (color: Color) => doc.setFillColor(...color);
  const wrap = (value: string, width: number, size: number, bold = false): string[] => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.splitTextToSize(value, width) as string[];
  };

  const addHeader = (continued = false) => {
    doc.addImage(officialLogo, 'PNG', margin, 16, 43, 12.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    textColor(MUTED);
    doc.text('Innovera for Intelligent Software Solutions', margin, 32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    textColor(INK);
    doc.text('Internship evaluation report', pageWidth - margin, 22, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(MUTED);
    doc.text(continued ? 'Continued' : `Issued ${formatReportDate()}`, pageWidth - margin, 29, { align: 'right' });
    drawColor(RULE);
    doc.setLineWidth(0.3);
    doc.line(margin, 38, pageWidth - margin, 38);
    y = 41;
  };

  const newPage = () => {
    doc.addPage();
    addHeader(true);
  };
  const ensureSpace = (height: number) => {
    if (y + height > contentBottom) newPage();
  };
  const section = (number: number, title: string, followingHeight = 12) => {
    ensureSpace(8 + followingHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    textColor(INK);
    doc.text(`${number}. ${title}`, margin, y);
    drawColor(RULE);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5);
    y += 8;
  };

  addHeader();

  // Document control: these are descriptive fields, not fabricated dates.
  const control = [
    ['Document', 'Official evaluation record'],
    ['Program', 'Internship program'],
    ['Issued by', 'Learning & Development'],
  ];
  const controlWidth = contentWidth / control.length;
  control.forEach(([label, value], index) => {
    const x = margin + controlWidth * index;
    if (index > 0) {
      drawColor(RULE);
      doc.line(x, y + 1, x, y + 14);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    textColor(MUTED);
    doc.text(label, x + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    textColor(INK);
    doc.text(value, x + 3, y + 11);
  });
  drawColor(RULE);
  doc.line(margin, y + 15, pageWidth - margin, y + 15);
  y += 19;

  // Candidate and program information. Height follows wrapped text.
  const studentLines = wrap(cleanText(data.studentName) || 'Student name unavailable', 78, 10.5, true);
  const trackLines = wrap(cleanText(data.courseTitle) || 'Internship program track', 78, 10.5, true);
  const profileHeight = 21 + Math.max(studentLines.length, trackLines.length) * 5;
  section(1, 'Candidate and program information', profileHeight);
  const profileTop = y;
  const profileColumn = (x: number, label: string, lines: string[]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(MUTED);
    doc.text(label, x, profileTop + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    textColor(INK);
    lines.forEach((line, index) => doc.text(line, x, profileTop + 9 + index * 5));
  };
  profileColumn(margin, 'Candidate / intern name', studentLines);
  profileColumn(margin + 91, 'Program / track', trackLines);
  y = profileTop + 10 + Math.max(studentLines.length, trackLines.length) * 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  textColor(MUTED);
  doc.text('Evaluation status', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  textColor(INK);
  doc.text(cleanText(data.classification) || 'Active', margin + 34, y);
  y += 9;

  // Summary uses a two-row grid so labels and numbers remain legible.
  section(2, 'Evaluation summary', 39);
  const tasks = (data.tasks || []).map(normalizeTaskRatings);
  const average = (key: 'communication_rating' | 'quality_rating' | 'teamwork_rating') => (
    tasks.length ? tasks.reduce((total, task) => total + Number(task[key] ?? 0), 0) / tasks.length : null
  );
  const communication = average('communication_rating');
  const quality = average('quality_rating');
  const teamwork = average('teamwork_rating');
  const attendanceRate = data.attendanceRate !== undefined
    ? Math.round(data.attendanceRate)
    : data.totalDays > 0 ? Math.round(data.attendedDays / data.totalDays * 100) : 0;
  const summary = [
    ['Attendance', `${data.attendedDays} / ${data.totalDays}`, `${attendanceRate}% attended`],
    ['Tasks completed', `${tasks.length}`, 'Deliverables'],
    ['Overall score', `${data.overallScore ?? 0} / 100`, cleanText(data.classification) || 'Active'],
    ['Communication', communication === null ? 'N/A' : `${communication.toFixed(1)} / ${TASK_RATING_MAX}`, communication === null ? 'Not evaluated' : 'Average rating'],
    ['Task quality', quality === null ? 'N/A' : `${quality.toFixed(1)} / ${TASK_RATING_MAX}`, quality === null ? 'Not evaluated' : 'Average rating'],
    ['Teamwork', teamwork === null ? 'N/A' : `${teamwork.toFixed(1)} / ${TASK_RATING_MAX}`, teamwork === null ? 'Not evaluated' : 'Average rating'],
  ];
  const summaryWidth = contentWidth / 3;
  summary.forEach(([label, value, detail], index) => {
    const x = margin + index % 3 * summaryWidth;
    const top = y + Math.floor(index / 3) * 18;
    fillColor(PALE);
    drawColor(RULE);
    doc.rect(x, top, summaryWidth, 18, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(MUTED);
    doc.text(label, x + 3, top + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    textColor(INK);
    doc.text(value, x + 3, top + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    textColor(MUTED);
    doc.text(detail, x + 3, top + 15.5);
  });
  y += 41;

  // Task rows may continue over multiple pages; no title or note is shortened.
  section(3, 'Deliverables and evaluation breakdown', 23);
  const columnWidths = [9, 61, 27, 23, 24, 30];
  const taskHeaders = ['No.', 'Task / deliverable', 'Communication', 'Quality', 'Teamwork', 'Task score'];
  const drawTaskHeader = () => {
    if (y + 21 > contentBottom) newPage();
    let x = margin;
    fillColor(PALE);
    drawColor(RULE);
    doc.rect(margin, y, contentWidth, 9, 'FD');
    taskHeaders.forEach((header, index) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(index === 2 ? 6.6 : 7.2);
      textColor(INK);
      doc.text(header, index === 1 ? x + 2 : x + columnWidths[index] / 2, y + 5.7, {
        align: index === 1 ? 'left' : 'center',
      });
      x += columnWidths[index];
    });
    y += 9;
  };
  const drawRowFrame = (height: number, shaded: boolean) => {
    if (shaded) {
      fillColor(PALE);
      doc.rect(margin, y, contentWidth, height, 'F');
    }
    drawColor(RULE);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, height, 'S');
    let x = margin;
    columnWidths.slice(0, -1).forEach((width) => {
      x += width;
      doc.line(x, y, x, y + height);
    });
  };
  const cellText = (value: string, x: number, width: number, height: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    textColor(INK);
    doc.text(value, x + width / 2, y + height / 2 + 1.1, { align: 'center' });
  };

  drawTaskHeader();
  if (tasks.length === 0) {
    const message = wrap('No individual task submissions were recorded for this evaluation cycle.', columnWidths[1] - 5, 8.5);
    const height = Math.max(14, message.length * 4.2 + 5);
    if (y + height > contentBottom) { newPage(); drawTaskHeader(); }
    drawRowFrame(height, false);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    textColor(MUTED);
    message.forEach((line, index) => doc.text(line, margin + columnWidths[0] + 2.5, y + 5 + index * 4.2));
    y += height;
  } else {
    tasks.forEach((task, index) => {
      const titleLines = wrap(cleanText(task.title) || `Task ${index + 1}`, columnWidths[1] - 5, 8.5, true);
      const noteLines = cleanText(task.note)
        ? wrap(`Note: ${cleanText(task.note)}`, columnWidths[1] - 5, 7.8)
        : [];
      const lines: TaskLine[] = [
        ...titleLines.map((text): TaskLine => ({ text, kind: 'title', height: 4.2 })),
        ...noteLines.map((text): TaskLine => ({ text, kind: 'note', height: 3.9 })),
      ];
      let position = 0;
      while (position < lines.length) {
        if (y + 12 > contentBottom) { newPage(); drawTaskHeader(); }
        const fragmentStart = position;
        const fragment: TaskLine[] = [];
        let usedHeight = 0;
        const availableHeight = contentBottom - y - 6;
        while (position < lines.length && usedHeight + lines[position].height <= availableHeight) {
          fragment.push(lines[position]);
          usedHeight += lines[position].height;
          position += 1;
        }
        if (fragment.length === 0) { newPage(); drawTaskHeader(); continue; }
        const height = Math.max(12, usedHeight + 6);
        drawRowFrame(height, index % 2 === 1);
        cellText(`${index + 1}`, margin, columnWidths[0], height);
        if (fragmentStart > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          textColor(MUTED);
          doc.text('cont.', margin + columnWidths[0] / 2, y + height / 2 + 4, { align: 'center' });
        }
        const ratings = [
          Number(task.communication_rating ?? 0).toFixed(1),
          Number(task.quality_rating ?? 0).toFixed(1),
          Number(task.teamwork_rating ?? 0).toFixed(1),
          averageTaskRating(task).toFixed(1),
        ];
        let x = margin + columnWidths[0] + columnWidths[1];
        ratings.forEach((rating, ratingIndex) => {
          const width = columnWidths[ratingIndex + 2];
          cellText(`${rating} / ${TASK_RATING_MAX}`, x, width, height, ratingIndex === 3);
          x += width;
        });
        let baseline = y + 4.7;
        fragment.forEach((line) => {
          doc.setFont('helvetica', line.kind === 'title' ? 'bold' : 'normal');
          doc.setFontSize(line.kind === 'title' ? 8.5 : 7.8);
          textColor(line.kind === 'title' ? INK : MUTED);
          doc.text(line.text, margin + columnWidths[0] + 2.5, baseline);
          baseline += line.height;
        });
        y += height;
        if (position < lines.length) { newPage(); drawTaskHeader(); }
      }
    });
  }
  y += 3;

  const feedback = cleanText(data.feedback)
    || 'No supervisor evaluation notes were provided for this reporting cycle.';
  const feedbackLines = wrap(feedback, contentWidth - 12, 9);
  section(4, 'Supervisor evaluation and notes', 20);
  let feedbackPosition = 0;
  while (feedbackPosition < feedbackLines.length) {
    const capacity = Math.floor((contentBottom - y - 10) / 4.6);
    if (capacity < 1) {
      newPage();
      section(4, 'Supervisor evaluation and notes (continued)', 20);
      continue;
    }
    const portion = feedbackLines.slice(feedbackPosition, feedbackPosition + capacity);
    feedbackPosition += portion.length;
    const boxHeight = portion.length * 4.6 + 10;
    drawColor(RULE);
    doc.rect(margin, y, contentWidth, boxHeight, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    textColor(INK);
    portion.forEach((line, index) => doc.text(line, margin + 5, y + 6.5 + index * 4.6));
    y += boxHeight + 3;
    if (feedbackPosition < feedbackLines.length) {
      newPage();
      section(4, 'Supervisor evaluation and notes (continued)', 20);
    }
  }
  if (data.feedbackUpdatedAt) {
    const updated = new Date(data.feedbackUpdatedAt);
    if (!Number.isNaN(updated.getTime())) {
      ensureSpace(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      textColor(MUTED);
      doc.text(`Evaluation updated: ${updated.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin, y);
      y += 7;
    }
  }

  const certification = 'This report records the candidate\'s assessment against the stated internship program criteria for attendance, deliverables, communication, task quality, and teamwork.';
  const certificationLines = wrap(certification, contentWidth, 8.5);
  ensureSpace(certificationLines.length * 4.3 + 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  textColor(MUTED);
  certificationLines.forEach((line, index) => doc.text(line, margin, y + index * 4.3));
  y += certificationLines.length * 4.3 + 8;

  section(5, 'Authorised approvals', 34);
  doc.addImage(mahaApproval, 'PNG', margin + 4, y + 1, 60, 33);
  doc.addImage(officialSeal, 'PNG', pageWidth - margin - 48, y + 2, 33, 30);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawColor(RULE);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    textColor(MUTED);
    doc.text('Innovera for Intelligent Software Solutions | Official evaluation record', margin, pageHeight - 11);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 11, { align: 'right' });
  }

  const defaultFilename = `Evaluation_Report_${safeFilenamePart(data.studentName, 'Student')}_${safeFilenamePart(data.studentCode, 'INV')}.pdf`;
  if (options.autoSave !== false) doc.save(options.filename || defaultFilename);

  void syncGeneratedPartnerDocument({
    studentCode: data.studentCode,
    documentType: 'report',
    title: 'Official Internship Evaluation Report',
    filename: options.filename || defaultFilename,
    blob: doc.output('blob'),
  });

  return doc;
};
