import api from './api';

export type PartnerDocumentType = 'certificate' | 'report';

interface PartnerDocumentSyncPayload {
  studentCode: string;
  documentType: PartnerDocumentType;
  title: string;
  filename: string;
  blob: Blob;
}

/**
 * Register a generated document for a partner without affecting the visible
 * main-dashboard workflow. Non-partner students and unavailable APIs are
 * intentionally ignored because the local download must remain successful.
 */
export const syncGeneratedPartnerDocument = async ({
  studentCode,
  documentType,
  title,
  filename,
  blob,
}: PartnerDocumentSyncPayload): Promise<void> => {
  if (!studentCode.trim() || !blob.size) return;

  const formData = new FormData();
  formData.append('student_code', studentCode.trim());
  formData.append('document_type', documentType);
  formData.append('title', title.trim());
  formData.append('file', blob, filename);

  try {
    await api.post('/partners/elswedy/documents/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch (error) {
    // A document generated for another organization, or a temporary partner
    // API failure, must never block the existing browser download.
    console.warn('Partner document sync skipped.', error);
  }
};
