export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  data: T | null;
  messages: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
