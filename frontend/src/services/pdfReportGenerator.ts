import { jsPDF } from 'jspdf';
import { averageTaskRating, normalizeTaskRatings, TASK_RATING_MAX } from '../utils/taskRatings';

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

const BLACK = [21, 21, 21] as const;
const DARK_GRAY = [60, 60, 60] as const;
const MID_GRAY = [106, 106, 106] as const;
const LIGHT_GRAY = [229, 229, 229] as const;
const PALE_GRAY = [245, 245, 245] as const;

const loadImageDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load report asset: ${url}`);
  }

  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
};

const cleanText = (value?: string): string => {
  if (!value) return '';
  return value
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
    .replace(/[\u2605\u2606]/g, '')
    .trim();
};

const safeFilenamePart = (value: string, fallback: string): string => {
  const sanitized = cleanText(value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 80);
  return sanitized || fallback;
};

const formatReportDate = (): string => new Date().toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const generateStudentPDFReport = async (
  data: ReportData,
  options: ReportGenerationOptions = {},
): Promise<jsPDF> => {
  const [officialLogo, officialApprovals] = await Promise.all([
    loadImageDataUrl(OFFICIAL_LOGO_URL),
    loadImageDataUrl(OFFICIAL_APPROVALS_URL),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - 20;
  const reportReference = `INN-${(cleanText(data.studentCode) || 'EVAL').slice(0, 36)}`;
  let y = 16;

  const setTextColor = (color: readonly [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setDrawColor = (color: readonly [number, number, number]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: readonly [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  const addHeader = () => {
    setDrawColor(BLACK);
    doc.setLineWidth(0.45);
    doc.line(margin, y, pageWidth - margin, y);

    doc.addImage(officialLogo, 'PNG', margin, y + 5, 43, 12.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    setTextColor(DARK_GRAY);
    doc.text('INNOVERA FOR INTELLIGENT SOFTWARE SOLUTIONS', margin, y + 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.6);
    setTextColor(BLACK);
    doc.text('OFFICIAL INTERNSHIP', pageWidth - margin, y + 5.5, { align: 'right' });
    doc.text('EVALUATION REPORT', pageWidth - margin, y + 11.8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setTextColor(MID_GRAY);
    doc.text(`Issued: ${formatReportDate()}`, pageWidth - margin, y + 18, { align: 'right' });
    doc.text(`Reference: ${reportReference}`, pageWidth - margin, y + 22, { align: 'right' });

    setDrawColor(BLACK);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 28, pageWidth - margin, y + 28);
    y += 33;
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    setDrawColor(BLACK);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    setTextColor(MID_GRAY);
    doc.text(
      'Innovera for Intelligent Software Solutions | Official Evaluation Record',
      margin,
      pageHeight - 10,
    );
    doc.text(
      `Page ${pageNumber} of ${totalPages} | Ref: ${reportReference}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' },
    );
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight <= contentBottom) return;
    doc.addPage();
    y = 16;
    addHeader();
  };

  const drawSectionHeading = (number: number, title: string) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    setTextColor(BLACK);
    doc.text(`${number}. ${title}`, margin, y);
    setDrawColor(DARK_GRAY);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 9;
  };

  const drawCenteredCellText = (
    text: string,
    x: number,
    top: number,
    width: number,
    height: number,
    fontSize: number,
    bold = false,
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    setTextColor(BLACK);
    doc.text(text, x + width / 2, top + height / 2 + fontSize * 0.13, { align: 'center' });
  };

  addHeader();

  // Document control
  checkPageBreak(18);
  const controlHeaders = ['DOCUMENT CLASSIFICATION', 'REPORTING PERIOD', 'ISSUING DEPARTMENT'];
  const controlValues = ['Official Evaluation Record', 'Summer Internship Program', 'Learning & Development'];
  const controlWidth = contentWidth / 3;
  const controlTop = y;

  for (let index = 0; index < 3; index += 1) {
    const x = margin + index * controlWidth;
    setFillColor(PALE_GRAY);
    setDrawColor(LIGHT_GRAY);
    doc.rect(x, controlTop, controlWidth, 6, 'FD');
    doc.rect(x, controlTop + 6, controlWidth, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    setTextColor(MID_GRAY);
    doc.text(controlHeaders[index], x + 3, controlTop + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.7);
    setTextColor(BLACK);
    doc.text(controlValues[index], x + 3, controlTop + 11);
  }
  setDrawColor(DARK_GRAY);
  doc.setLineWidth(0.3);
  doc.rect(margin, controlTop, contentWidth, 14, 'S');
  y += 17;

  // Candidate and program information
  drawSectionHeading(1, 'CANDIDATE AND PROGRAM INFORMATION');
  const profileTop = y;
  const profileHeight = data.phone || data.personalEmail ? 33 : 25;
  const columnGap = 9;
  const columnWidth = (contentWidth - columnGap) / 2;

  const drawLabelValue = (x: number, top: number, label: string, value: string, width: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    setTextColor(MID_GRAY);
    doc.text(label, x, top);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.3);
    setTextColor(BLACK);
    const lines = doc.splitTextToSize(value, width) as string[];
    doc.text(lines.slice(0, 2), x, top + 5);
  };

  drawLabelValue(margin, profileTop, 'CANDIDATE / INTERN NAME', cleanText(data.studentName) || 'Student Name', columnWidth);
  drawLabelValue(
    margin + columnWidth + columnGap,
    profileTop,
    'PROGRAM / TRACK TITLE',
    cleanText(data.courseTitle) || 'Internship Program Track',
    columnWidth,
  );
  drawLabelValue(margin, profileTop + 17, 'STUDENT CODE / ID', cleanText(data.studentCode) || 'N/A', columnWidth);
  drawLabelValue(
    margin + columnWidth + columnGap,
    profileTop + 17,
    'EVALUATION STATUS',
    (cleanText(data.classification) || 'ACTIVE').toUpperCase(),
    columnWidth,
  );

  if (data.phone || data.personalEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    setTextColor(MID_GRAY);
    const contact = [
      data.phone ? `Phone: ${cleanText(data.phone)}` : '',
      data.personalEmail ? `Email: ${cleanText(data.personalEmail)}` : '',
    ].filter(Boolean).join(' | ');
    doc.text(contact, margin, profileTop + 29);
  }

  setDrawColor(LIGHT_GRAY);
  doc.setLineWidth(0.25);
  doc.line(
    margin + columnWidth + columnGap / 2,
    profileTop - 2,
    margin + columnWidth + columnGap / 2,
    profileTop + profileHeight - 4,
  );
  y += profileHeight + 2;

  // Evaluation summary
  drawSectionHeading(2, 'EVALUATION SUMMARY');
  const attendanceRate = data.attendanceRate !== undefined
    ? Math.round(data.attendanceRate)
    : data.totalDays > 0
      ? Math.round((data.attendedDays / data.totalDays) * 100)
      : 0;
  const tasks = (data.tasks ?? []).map(normalizeTaskRatings);
  const tasksCount = tasks.length;
  const average = (key: 'communication_rating' | 'quality_rating' | 'teamwork_rating') => {
    if (tasksCount === 0) return null;
    return tasks.reduce((sum, task) => sum + Number(task[key] ?? 0), 0) / tasksCount;
  };
  const averageCommunication = average('communication_rating');
  const averageQuality = average('quality_rating');
  const averageTeamwork = average('teamwork_rating');
  const summaryHeaders = ['ATTENDANCE', 'TASKS COMPLETED', 'COMMUNICATION', 'TASK QUALITY', 'TEAMWORK', 'OVERALL SCORE'];
  const summaryValues = [
    `${data.attendedDays} / ${data.totalDays}`,
    `${tasksCount}`,
    averageCommunication === null ? 'N/A' : `${averageCommunication.toFixed(1)} / ${TASK_RATING_MAX}.0`,
    averageQuality === null ? 'N/A' : `${averageQuality.toFixed(1)} / ${TASK_RATING_MAX}.0`,
    averageTeamwork === null ? 'N/A' : `${averageTeamwork.toFixed(1)} / ${TASK_RATING_MAX}.0`,
    `${data.overallScore ?? 0} / 100`,
  ];
  const summaryDetails = [
    `${attendanceRate}%`,
    'Deliverables',
    averageCommunication === null ? 'Not evaluated' : `${Math.round((averageCommunication / TASK_RATING_MAX) * 100)}%`,
    averageQuality === null ? 'Not evaluated' : `${Math.round((averageQuality / TASK_RATING_MAX) * 100)}%`,
    averageTeamwork === null ? 'Not evaluated' : `${Math.round((averageTeamwork / TASK_RATING_MAX) * 100)}%`,
    cleanText(data.classification) || 'Active',
  ];
  const summaryCellWidth = contentWidth / 6;
  const summaryTop = y;

  summaryHeaders.forEach((header, index) => {
    const x = margin + index * summaryCellWidth;
    setFillColor(DARK_GRAY);
    setDrawColor(LIGHT_GRAY);
    doc.rect(x, summaryTop, summaryCellWidth, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(header, x + summaryCellWidth / 2, summaryTop + 4, { align: 'center' });

    doc.rect(x, summaryTop + 6, summaryCellWidth, 8, 'S');
    drawCenteredCellText(summaryValues[index], x, summaryTop + 6, summaryCellWidth, 8, 9, true);

    doc.rect(x, summaryTop + 14, summaryCellWidth, 6, 'S');
    drawCenteredCellText(summaryDetails[index], x, summaryTop + 14, summaryCellWidth, 6, 6.7);
  });
  setDrawColor(DARK_GRAY);
  doc.setLineWidth(0.3);
  doc.rect(margin, summaryTop, contentWidth, 20, 'S');
  y += 25;

  // Detailed deliverables table
  drawSectionHeading(3, 'DETAILED DELIVERABLES AND EVALUATION BREAKDOWN');
  const columnWidths = [9, 68, 26, 22, 24, 25];
  const taskHeaders = ['NO.', 'TASK TITLE / DELIVERABLE', 'COMMUNICATION', 'QUALITY', 'TEAMWORK', 'SCORE'];

  const drawTaskHeader = () => {
    const headerTop = y;
    let x = margin;
    taskHeaders.forEach((header, index) => {
      setFillColor(DARK_GRAY);
      setDrawColor(LIGHT_GRAY);
      doc.rect(x, headerTop, columnWidths[index], 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(index === 1 ? 5.8 : 5.4);
      doc.setTextColor(255, 255, 255);
      doc.text(
        header,
        index === 1 ? x + 2 : x + columnWidths[index] / 2,
        headerTop + 4.5,
        { align: index === 1 ? 'left' : 'center' },
      );
      x += columnWidths[index];
    });
    y += 7;
  };

  drawTaskHeader();

  if (tasksCount === 0) {
    const rowHeight = 13;
    setDrawColor(LIGHT_GRAY);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');
    let x = margin;
    columnWidths.slice(0, -1).forEach((width) => {
      x += width;
      doc.line(x, y, x, y + rowHeight);
    });
    drawCenteredCellText('-', margin, y, columnWidths[0], rowHeight, 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setTextColor(BLACK);
    const emptyLines = doc.splitTextToSize(
      'No individual task submissions were recorded for this evaluation cycle.',
      columnWidths[1] - 6,
    ) as string[];
    doc.text(emptyLines, margin + columnWidths[0] + 3, y + 5);

    let valueX = margin + columnWidths[0] + columnWidths[1];
    for (let index = 2; index < columnWidths.length; index += 1) {
      drawCenteredCellText('-', valueX, y, columnWidths[index], rowHeight, 7);
      valueX += columnWidths[index];
    }
    y += rowHeight;
  } else {
    tasks.forEach((task, index) => {
      const rawTitleLines = doc.splitTextToSize(
        cleanText(task.title) || `Task ${index + 1}`,
        columnWidths[1] - 6,
      ) as string[];
      const titleLines = rawTitleLines.slice(0, 12);
      if (rawTitleLines.length > titleLines.length) {
        titleLines[titleLines.length - 1] = `${titleLines[titleLines.length - 1].replace(/[.\s]+$/, '')}...`;
      }
      const rawNoteLines = cleanText(task.note)
        ? doc.splitTextToSize(`Note: ${cleanText(task.note)}`, columnWidths[1] - 6) as string[]
        : [];
      const noteLines = rawNoteLines.slice(0, 4);
      if (rawNoteLines.length > noteLines.length && noteLines.length > 0) {
        noteLines[noteLines.length - 1] = `${noteLines[noteLines.length - 1].replace(/[.\s]+$/, '')}...`;
      }
      const rowHeight = Math.max(9, titleLines.length * 3.8 + noteLines.length * 3.2 + 4);

      if (y + rowHeight > contentBottom) {
        doc.addPage();
        y = 16;
        addHeader();
        drawTaskHeader();
      }

      if (index % 2 === 1) {
        setFillColor(PALE_GRAY);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      setDrawColor(LIGHT_GRAY);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');
      let x = margin;
      columnWidths.slice(0, -1).forEach((width) => {
        x += width;
        doc.line(x, y, x, y + rowHeight);
      });

      drawCenteredCellText(`${index + 1}`, margin, y, columnWidths[0], rowHeight, 7.4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      setTextColor(BLACK);
      const titleX = margin + columnWidths[0] + 3;
      doc.text(titleLines, titleX, y + 4.5);
      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.1);
        setTextColor(MID_GRAY);
        doc.text(noteLines, titleX, y + 4.5 + titleLines.length * 3.8);
      }

      const communication = Number(task.communication_rating ?? 0);
      const quality = Number(task.quality_rating ?? 0);
      const teamwork = Number(task.teamwork_rating ?? 0);
      const taskScore = averageTaskRating(task).toFixed(1);
      const rowValues = [
        `${communication.toFixed(1)} / ${TASK_RATING_MAX}.0`,
        `${quality.toFixed(1)} / ${TASK_RATING_MAX}.0`,
        `${teamwork.toFixed(1)} / ${TASK_RATING_MAX}.0`,
        `${taskScore} / ${TASK_RATING_MAX}.0`,
      ];

      let valueX = margin + columnWidths[0] + columnWidths[1];
      rowValues.forEach((value, valueIndex) => {
        const width = columnWidths[valueIndex + 2];
        drawCenteredCellText(value, valueX, y, width, rowHeight, 7.1, valueIndex === 3);
        valueX += width;
      });
      y += rowHeight;
    });
  }
  y += 5;

  // Official narrative
  const feedback = cleanText(data.feedback)
    || 'The candidate demonstrates consistent learning progress, professional conduct, and active commitment to assigned objectives. Performance during the evaluation period meets the requirements of the Summer Internship Program.';
  const feedbackLines = doc.splitTextToSize(feedback, contentWidth - 14) as string[];
  const feedbackLineHeight = 4.4;
  checkPageBreak(42);
  drawSectionHeading(4, 'OFFICIAL EVALUATION AND SUPERVISOR NOTES');
  const remainingFeedbackLines = [...feedbackLines];

  while (remainingFeedbackLines.length > 0) {
    const availableHeight = contentBottom - y;
    const finalLineCapacity = Math.max(1, Math.floor((availableHeight - 11) / feedbackLineHeight));
    const isFinalBlock = remainingFeedbackLines.length <= finalLineCapacity;
    const lineCapacity = isFinalBlock
      ? finalLineCapacity
      : Math.max(1, Math.floor((availableHeight - 8) / feedbackLineHeight));
    const blockLines = remainingFeedbackLines.splice(0, lineCapacity);
    const feedbackBoxHeight = Math.max(
      isFinalBlock ? 21 : 16,
      blockLines.length * feedbackLineHeight + (isFinalBlock ? 11 : 8),
    );

    setDrawColor(DARK_GRAY);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, feedbackBoxHeight, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    setTextColor(BLACK);
    doc.text(blockLines, margin + 4, y + 7);

    if (isFinalBlock && data.feedbackUpdatedAt) {
      const updatedDate = new Date(data.feedbackUpdatedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      setTextColor(MID_GRAY);
      doc.text(`Evaluation updated: ${updatedDate}`, margin + 4, y + feedbackBoxHeight - 3.5);
    }

    y += feedbackBoxHeight + 7;
    if (remainingFeedbackLines.length > 0) {
      doc.addPage();
      y = 16;
      addHeader();
      drawSectionHeading(4, 'OFFICIAL EVALUATION AND SUPERVISOR NOTES (CONTINUED)');
    }
  }

  // Administrative certification and official approvals
  const certification = 'This document constitutes an official performance evaluation issued by Innovera. It certifies that the candidate has been assessed against the attendance, deliverable, communication, quality, and teamwork standards of the stated internship program.';
  const certificationLines = doc.splitTextToSize(certification, contentWidth) as string[];
  const approvalsWidth = contentWidth - 40;
  const approvalsHeight = approvalsWidth * (520 / 1930);
  checkPageBreak(certificationLines.length * 3.7 + approvalsHeight + 20);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  setTextColor(DARK_GRAY);
  doc.text(certificationLines, margin, y);
  y += certificationLines.length * 3.7 + 5;

  drawSectionHeading(5, 'AUTHORIZED APPROVALS');
  doc.addImage(
    officialApprovals,
    'PNG',
    margin + (contentWidth - approvalsWidth) / 2,
    y + 1,
    approvalsWidth,
    approvalsHeight,
  );
  y += approvalsHeight + 2;

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    addFooter(pageNumber, totalPages);
  }

  const defaultFilename = `Evaluation_Report_${safeFilenamePart(data.studentName, 'Student')}_${safeFilenamePart(data.studentCode, 'INV')}.pdf`;
  if (options.autoSave !== false) {
    doc.save(options.filename || defaultFilename);
  }

  return doc;
};
