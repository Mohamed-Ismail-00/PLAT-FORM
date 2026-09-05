export const TASK_RATING_MAX = 10;

export type TaskRatingFields = {
  communication_rating: number;
  quality_rating: number;
  teamwork_rating: number;
  rating_scale?: number;
};

const clampRating = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(TASK_RATING_MAX, Math.max(0, numericValue));
};

/** Converts legacy five-point task ratings to the current ten-point scale. */
export const normalizeTaskRatings = <T extends TaskRatingFields>(task: T): T & { rating_scale: 10 } => {
  const isLegacyFivePoint = task.rating_scale !== 10;
  const multiplier = isLegacyFivePoint ? 2 : 1;

  return {
    ...task,
    communication_rating: clampRating(Number(task.communication_rating) * multiplier),
    quality_rating: clampRating(Number(task.quality_rating) * multiplier),
    teamwork_rating: clampRating(Number(task.teamwork_rating) * multiplier),
    rating_scale: 10,
  };
};

export const averageTaskRating = (task: TaskRatingFields): number => (
  (clampRating(task.communication_rating) + clampRating(task.quality_rating) + clampRating(task.teamwork_rating)) / 3
);
