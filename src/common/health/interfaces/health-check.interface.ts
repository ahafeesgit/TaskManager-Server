export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export interface HealthIndicator {
  key: string;
  isHealthy(): Promise<boolean>;
  getDetails?(): Promise<Record<string, any>>;
}

export interface DatabaseHealthIndicator extends HealthIndicator {
  pingDatabase(): Promise<boolean>;
}

export interface MemoryHealthIndicator extends HealthIndicator {
  checkHeapMemory(threshold: number): Promise<boolean>;
  checkRSSMemory(threshold: number): Promise<boolean>;
}

export interface DiskHealthIndicator extends HealthIndicator {
  checkDiskSpace(path: string, thresholdPercent: number): Promise<boolean>;
}

export interface CustomHealthCheck {
  name: string;
  check: () => Promise<{ status: 'up' | 'down'; [key: string]: any }>;
}
