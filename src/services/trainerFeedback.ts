import api from './api';

export interface RatingColumnMapping {
  column: string;
  max_score: number | null;
}

export interface TrainerFeedbackMapping {
  trainer_column: string;
  submitted_at_column: string | null;
  feedback_column: string | null;
  rating_columns: RatingColumnMapping[];
}

export interface TrainerFeedbackPreview {
  filename: string;
  source_format: string;
  worksheet_name: string | null;
  headers: string[];
  row_count: number;
  sample_rows: Record<string, string>[];
  suggested_mapping: TrainerFeedbackMapping;
}

export interface TrainerAxisScore {
  name: string;
  score: number;
  response_count: number;
}

export interface TrainerPerformanceItem {
  rank: number;
  trainer_name: string;
  response_count: number;
  overall_score: number | null;
  confidence: string;
  status: string;
  axis_scores: TrainerAxisScore[];
  feedback_count: number;
  recent_feedback: string[];
}

export interface TrainerPerformanceAnalytics {
  total_trainers: number;
  total_responses: number;
  overall_score: number | null;
  latest_import_at: string | null;
  trainers: TrainerPerformanceItem[];
}

const upload = async <T>(url: string, file: File, mapping?: TrainerFeedbackMapping): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);
  if (mapping) formData.append('mapping_json', JSON.stringify(mapping));
  const response = await api.post<{ data: T }>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const previewTrainerFeedbackFile = (file: File) => upload<TrainerFeedbackPreview>('/trainer-feedback/preview', file);

export const importTrainerFeedbackFile = (file: File, mapping: TrainerFeedbackMapping) => upload<{
  import_id: string;
  imported_rows: number;
  skipped_rows: number;
  duplicate: boolean;
}>('/trainer-feedback/imports', file, mapping);

export const getTrainerFeedbackAnalytics = async (): Promise<TrainerPerformanceAnalytics> => {
  const response = await api.get<{ data: TrainerPerformanceAnalytics }>('/trainer-feedback/analytics');
  return response.data.data;
};
