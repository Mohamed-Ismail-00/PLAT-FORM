import api from './api';

const OUTBOX_KEY = 'innovera_certificate_audit_outbox_v1';

export type CertificateProgramType = 'intern' | 'student';
export type CertificateFileFormat = 'pdf' | 'png';

export interface CertificateAuditEventInput {
  studentId: string;
  enrollmentId: string;
  certificateType: 'internship' | 'course';
  fileFormat: CertificateFileFormat;
  programTitle: string;
  trainingPeriod?: string;
  courseHours?: number;
}

interface PendingCertificateAuditEvent extends CertificateAuditEventInput {
  eventId: string;
}

export interface CertificateActivitySummary {
  issued: boolean;
  total_issuance_records: number;
  last_issued_at: string | null;
  last_issued_by_name: string | null;
}

export interface CertificateIssuanceListItem {
  id: string;
  student_id: string | null;
  enrollment_id: string | null;
  student_name: string;
  student_code: string;
  program_title: string;
  training_period: string | null;
  course_hours: number | null;
  certificate_type: 'internship' | 'course';
  file_format: CertificateFileFormat;
  issued_by_name: string;
  issued_at: string;
}

export interface CertificateIssuanceListResponse {
  data: CertificateIssuanceListItem[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

let flushInFlight: Promise<void> | null = null;

const isBrowser = () => typeof window !== 'undefined';

const newEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const readOutbox = (): PendingCertificateAuditEvent[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeOutbox = (events: PendingCertificateAuditEvent[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
  } catch (error) {
    // Downloading remains available even when browser storage is unavailable.
    console.warn('Certificate audit queue could not be persisted.', error);
  }
};

const toRequestPayload = (event: PendingCertificateAuditEvent) => ({
  event_id: event.eventId,
  student_id: event.studentId,
  enrollment_id: event.enrollmentId,
  certificate_type: event.certificateType,
  file_format: event.fileFormat,
  program_title: event.programTitle,
  training_period: event.trainingPeriod || undefined,
  course_hours: event.courseHours,
});

/**
 * Sends queued events in order. A successful retry for the same event ID is
 * idempotent on the server, so an interrupted request cannot create a duplicate.
 */
export const flushCertificateAuditOutbox = async (): Promise<void> => {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    let queue = readOutbox();
    while (queue.length > 0) {
      const current = queue[0];
      try {
        await api.post('/certificates/issuances', toRequestPayload(current));
      } catch (error) {
        console.warn('Certificate audit event will be retried later.', error);
        break;
      }
      queue = queue.slice(1);
      writeOutbox(queue);
    }
  })();

  try {
    await flushInFlight;
  } finally {
    flushInFlight = null;
  }
};

/** Queue first, then synchronize in the background without delaying a download. */
export const recordCertificateDownload = (input: CertificateAuditEventInput): void => {
  const queue = readOutbox();
  queue.push({ ...input, eventId: newEventId() });
  writeOutbox(queue);
  void flushCertificateAuditOutbox();
};

export const getCertificateActivity = async (
  studentId: string,
  programType: CertificateProgramType,
): Promise<CertificateActivitySummary> => {
  const response = await api.get(`/certificates/students/${studentId}/activity`, {
    params: { program_type: programType },
  });
  return response.data.data as CertificateActivitySummary;
};

export const getCertificateIssuanceHistory = async (params: {
  programType: CertificateProgramType;
  page: number;
  search?: string;
  issuedFrom?: string;
  issuedTo?: string;
}): Promise<CertificateIssuanceListResponse> => {
  const response = await api.get('/certificates/issuances', {
    params: {
      program_type: params.programType,
      page: params.page,
      page_size: 20,
      search: params.search || undefined,
      issued_from: params.issuedFrom || undefined,
      issued_to: params.issuedTo || undefined,
    },
  });
  return response.data as CertificateIssuanceListResponse;
};
