export interface ApiError {
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
}
