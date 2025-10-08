import { Injectable, Optional } from '@nestjs/common';
import { DatabaseHealthIndicator } from '../interfaces/health-check.interface';

// Generic database interface that can be implemented by any database service
export interface DatabaseService {
  $queryRaw?: (
    query: TemplateStringsArray | string,
    ...args: any[]
  ) => Promise<any>;
  query?: (text: string, params?: any[]) => Promise<any>;
  ping?: () => Promise<boolean>;
  isConnected?: () => boolean;
}

@Injectable()
export class DatabaseHealthService implements DatabaseHealthIndicator {
  readonly key = 'database';

  constructor(@Optional() private readonly databaseService?: DatabaseService) {}

  async isHealthy(): Promise<boolean> {
    try {
      return await this.pingDatabase();
    } catch (error) {
      return false;
    }
  }

  async pingDatabase(): Promise<boolean> {
    if (!this.databaseService) {
      // No database service provided, assume healthy
      return true;
    }

    try {
      // Try different ping methods based on what's available
      if (this.databaseService.ping) {
        return await this.databaseService.ping();
      }

      if (this.databaseService.isConnected) {
        return this.databaseService.isConnected();
      }

      if (this.databaseService.$queryRaw) {
        // Prisma-style query
        await this.databaseService.$queryRaw`SELECT 1`;
        return true;
      }

      if (this.databaseService.query) {
        // PostgreSQL/MySQL style query
        await this.databaseService.query('SELECT 1');
        return true;
      }

      // If no ping method is available, assume connected
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDetails(): Promise<Record<string, any>> {
    if (!this.databaseService) {
      return {
        status: 'not_configured',
        message: 'No database service configured',
      };
    }

    try {
      const isConnected = await this.pingDatabase();
      return {
        connected: isConnected,
        status: isConnected ? 'up' : 'down',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
