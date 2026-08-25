import { jsPDF } from 'jspdf';
import { type TaskItem } from '../components/EditStudentProgressModal';

export interface ReportData {
  studentName: string;
  studentCode: string;
  courseTitle: string;
  overallScore: number | string;
  classification: string;
  attendedDays: number;
  totalDays: number;
  tasks: TaskItem[];
  feedback?: string;
  feedbackUpdatedAt?: string;
  attendanceRate?: number;
}

export const generateStudentPDFReport = (data: ReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Clean strings without emojis
  const clean = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
      .replace(/[★☆]/g, '')
      .trim();
  };

  // Helper colors
  const PRIMARY = [15, 23, 42]; // #0F172A Dark Slate
  const ACCENT = [79, 70, 229]; // #4F46E5 Indigo
  const TEXT_DARK = [30, 41, 59]; // #1E293B
  const TEXT_MUTED = [100, 116, 139]; // #64748B
  const BORDER_COLOR = [226, 232, 240]; // #E2E8F0
  const BG_LIGHT = [248, 250, 252]; // #F8FAFC
  const SUCCESS = [16, 185, 129]; // #10B981

  // ================= 1. HEADER =================
  // Header background bar
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INNOVERA', margin + 8, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('PERFORMANCE INTELLIGENCE SYSTEM', margin + 8, y + 17);

  // Document Title on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL PERFORMANCE EVALUATION REPORT', pageWidth - margin - 8, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Issued: ${reportDate} | Ref: INV-${data.studentCode || 'EVAL'}`, pageWidth - margin - 8, y + 17, { align: 'right' });

  y += 30;

  // ================= 2. STUDENT & PROGRAM PROFILE =================
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  // Left Column: Student Details
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CANDIDATE / INTERN NAME', margin + 6, y + 8);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFontSize(12);
  doc.text(clean(data.studentName) || 'Student Name', margin + 6, y + 15);

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFontSize(8);
  doc.text('STUDENT CODE / ID', margin + 6, y + 23);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFontSize(9);
  doc.text(data.studentCode || 'N/A', margin + 6, y + 29);

  // Middle Column: Track
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFontSize(8);
  doc.text('PROGRAM / TRACK TITLE', margin + 75, y + 8);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFontSize(10);
  doc.text(clean(data.courseTitle) || 'General Internship Track', margin + 75, y + 15);

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFontSize(8);
  doc.text('EVALUATION STATUS', margin + 75, y + 23);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text((clean(data.classification) || 'ACTIVE').toUpperCase(), margin + 75, y + 29);

  // Right Column: Overall Score Badge
  const scoreBoxWidth = 44;
  const scoreBoxX = pageWidth - margin - scoreBoxWidth - 6;
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.roundedRect(scoreBoxX, y + 5, scoreBoxWidth, 24, 2, 2, 'F');

  doc.setTextColor(200, 210, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('OVERALL SCORE', scoreBoxX + scoreBoxWidth / 2, y + 11, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${data.overallScore || '100'} / 100`, scoreBoxX + scoreBoxWidth / 2, y + 19, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(52, 211, 153); // Emerald
  doc.text('AI Evaluated', scoreBoxX + scoreBoxWidth / 2, y + 25, { align: 'center' });

  y += 40;

  // ================= 3. SUMMARY KPI TILES =================
  const attRate = data.attendanceRate !== undefined 
    ? data.attendanceRate 
    : (data.totalDays > 0 ? Math.round((data.attendedDays / data.totalDays) * 100) : 0);
  
  const tasksCount = data.tasks ? data.tasks.length : 0;
  
  // Calculate average criteria across all tasks
  let avgComm = 5.0;
  let avgQuality = 5.0;
  let avgTeam = 5.0;
  let avgDeliverable = 5.0;

  if (tasksCount > 0) {
    avgComm = Number((data.tasks.reduce((acc, t) => acc + (t.communication_rating || 5), 0) / tasksCount).toFixed(1));
    avgQuality = Number((data.tasks.reduce((acc, t) => acc + (t.quality_rating || 5), 0) / tasksCount).toFixed(1));
    avgTeam = Number((data.tasks.reduce((acc, t) => acc + (t.teamwork_rating || 5), 0) / tasksCount).toFixed(1));
    avgDeliverable = Number(((avgComm + avgQuality + avgTeam) / 3).toFixed(1));
  }

  const kpis = [
    { title: 'DAYS ATTENDED', value: `${data.attendedDays} / ${data.totalDays}`, sub: `${attRate}% Attendance Rate` },
    { title: 'TASKS COMPLETED', value: `${tasksCount} Tasks`, sub: 'All Deliverables' },
    { title: 'COMMUNICATION', value: `${avgComm.toFixed(1)} / 5.0`, sub: `${Math.round((avgComm / 5) * 100)}% Rating` },
    { title: 'TASK QUALITY', value: `${avgQuality.toFixed(1)} / 5.0`, sub: `${Math.round((avgQuality / 5) * 100)}% Rating` },
    { title: 'TEAMWORK', value: `${avgTeam.toFixed(1)} / 5.0`, sub: `${Math.round((avgTeam / 5) * 100)}% Rating` },
  ];

  const tileWidth = (contentWidth - 8) / 5;
  kpis.forEach((kpi, idx) => {
    const tileX = margin + idx * (tileWidth + 2);
    doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.roundedRect(tileX, y, tileWidth, 20, 1.5, 1.5, 'FD');

    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(kpi.title, tileX + tileWidth / 2, y + 5.5, { align: 'center' });

    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFontSize(10);
    doc.text(kpi.value, tileX + tileWidth / 2, y + 12, { align: 'center' });

    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(kpi.sub, tileX + tileWidth / 2, y + 17, { align: 'center' });
  });

  y += 26;

  // ================= 4. DETAILED DELIVERABLES ASSESSMENT TABLE =================
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETAILED DELIVERABLES & EVALUATION BREAKDOWN', margin, y);

  y += 4;

  // Table Header
  const colWidths = [12, 70, 24, 24, 24, 28]; // Total = 182 = contentWidth
  const headers = ['#', 'Task Title / Deliverable', 'Communication', 'Task Quality', 'Teamwork', 'Task Score'];

  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  let curX = margin;
  headers.forEach((h, idx) => {
    const align = idx === 0 ? 'center' : idx >= 2 ? 'center' : 'left';
    const textX = align === 'center' ? curX + colWidths[idx] / 2 : curX + 3;
    doc.text(h, textX, y + 4.8, { align });
    curX += colWidths[idx];
  });

  y += 7;

  // Table Rows
  if (data.tasks && data.tasks.length > 0) {
    data.tasks.forEach((task, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : BG_LIGHT[0], isEven ? 255 : BG_LIGHT[1], isEven ? 255 : BG_LIGHT[2]);
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.rect(margin, y, contentWidth, 8.5, 'FD');

      const taskScore = ((task.communication_rating + task.quality_rating + task.teamwork_rating) / 3).toFixed(1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

      let rowX = margin;
      // Col 0: Index
      doc.text(`${idx + 1}`, rowX + colWidths[0] / 2, y + 5.5, { align: 'center' });
      rowX += colWidths[0];

      // Col 1: Title & link
      doc.setFont('helvetica', 'bold');
      const cleanTitle = clean(task.title) || `Task #${idx + 1}`;
      const truncatedTitle = cleanTitle.length > 38 ? cleanTitle.substring(0, 36) + '...' : cleanTitle;
      doc.text(truncatedTitle, rowX + 3, y + 5.5);
      rowX += colWidths[1];

      // Col 2: Comm
      doc.setFont('helvetica', 'normal');
      doc.text(`${task.communication_rating} / 5.0`, rowX + colWidths[2] / 2, y + 5.5, { align: 'center' });
      rowX += colWidths[2];

      // Col 3: Quality
      doc.text(`${task.quality_rating} / 5.0`, rowX + colWidths[3] / 2, y + 5.5, { align: 'center' });
      rowX += colWidths[3];

      // Col 4: Team
      doc.text(`${task.teamwork_rating} / 5.0`, rowX + colWidths[4] / 2, y + 5.5, { align: 'center' });
      rowX += colWidths[4];

      // Col 5: Score
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text(`${taskScore} / 5.0`, rowX + colWidths[5] / 2, y + 5.5, { align: 'center' });

      y += 8.5;
    });
  } else {
    // Empty tasks row
    doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.rect(margin, y, contentWidth, 10, 'FD');
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No individual task submissions recorded for this evaluation cycle.', margin + contentWidth / 2, y + 6.5, { align: 'center' });
    y += 10;
  }

  y += 6;

  // ================= 5. INTERN LEAD OFFICIAL FEEDBACK & NOTES =================
  const feedbackContent = clean(data.feedback) || 'Candidate demonstrates steady learning velocity, active commitment to project objectives, and meets program requirements successfully.';

  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INTERN LEAD OFFICIAL EVALUATION & NOTES', margin, y);

  y += 4;

  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'FD');

  // Left accent line
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(margin, y, 2.5, 26, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

  const splitFeedback = doc.splitTextToSize(feedbackContent, contentWidth - 14);
  doc.text(splitFeedback, margin + 7, y + 7);

  if (data.feedbackUpdatedAt) {
    const updatedDate = new Date(data.feedbackUpdatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Evaluation Timestamp: ${updatedDate}`, margin + 7, y + 22);
  }

  y += 32;

  // ================= 6. EXECUTIVE SIGNATURES & VERIFICATION =================
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // Left Signature: Intern Lead
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('EVALUATION SUPERVISOR (INTERN LEAD)', margin + 10, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature: _________________________________', margin + 10, y + 12);
  doc.text('Date:       _________________________________', margin + 10, y + 18);

  // Right Signature: Program Director
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('INTERNSHIP PROGRAM DIRECTOR', margin + 110, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature: _________________________________', margin + 110, y + 12);
  doc.text('Seal / Stamp: [  OFFICIAL INNOVERA SEAL  ]', margin + 110, y + 18);

  // ================= 7. FOOTER =================
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

  doc.setTextColor(200, 210, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Innovera Performance Intelligence System | Confidential Document | Generated Automatically for Administrative Review', pageWidth / 2, pageHeight - 4, { align: 'center' });

  // Save the PDF
  const filename = `Evaluation_Report_${(clean(data.studentName) || 'Student').replace(/\s+/g, '_')}_${data.studentCode || 'INV'}.pdf`;
  doc.save(filename);
};
