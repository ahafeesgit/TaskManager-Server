/**
 * Simple API Response Types
 * 
 * Standardizes all API responses to have consistent format:
 * { success: boolean, code: number, data: any, messages: string[] }
 */

export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  data: T | null;
  messages: string[];
}

// For list responses without pagination
export interface ListData<T> {
  items: T[];
}

// For paginated list responses  
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}