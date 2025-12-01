/**
 * API Response Types for Filters Module
 *
 * These types are internal to the filters module to ensure
 * complete modularity. When copying this module to a new project,
 * all required types come with it.
 *
 * Note: Using FilterApiResponse to avoid conflicts with other modules
 */

export interface FilterApiResponse<T = any> {
  success: boolean;
  code: number;
  data: T | null;
  messages: string[];
}
