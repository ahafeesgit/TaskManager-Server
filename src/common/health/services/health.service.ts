import { Injectable } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthIndicator,
  CustomHealthCheck,
} from '../interfaces/health-check.interface';
import { MemoryHealthService } from '../indicators/memory-health.service';
import { DiskHealthService } from '../indicators/disk-health.service';
import { DatabaseHealthService } from '../indicators/database-health.service';

@Injectable()
export class HealthService {
  private customHealthChecks: CustomHealthCheck[] = [];

  constructor(
    private readonly memoryHealth: MemoryHealthService,
    private readonly diskHealth: DiskHealthService,
    private readonly databaseHealth: DatabaseHealthService,
  ) {}

  /**
   * Add custom health check
   */
  addHealthCheck(healthCheck: CustomHealthCheck): void {
    this.customHealthChecks.push(healthCheck);
  }

  /**
   * Remove custom health check
   */
  removeHealthCheck(name: string): void {
    this.customHealthChecks = this.customHealthChecks.filter(
      (check) => check.name !== name,
    );
  }

  /**
   * Comprehensive health check
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const info: Record<string, any> = {};
    const errors: Record<string, any> = {};
    const details: Record<string, any> = {};

    try {
      // Built-in health checks
      const indicators: HealthIndicator[] = [
        this.memoryHealth,
        this.diskHealth,
        this.databaseHealth,
      ];

      // Run all health checks in parallel for better performance
      const healthPromises = indicators.map(async (indicator) => {
        try {
          const isHealthy = await indicator.isHealthy();
          const indicatorDetails = indicator.getDetails
            ? await indicator.getDetails()
            : {};

          if (isHealthy) {
            info[indicator.key] = { status: 'up', ...indicatorDetails };
          } else {
            errors[indicator.key] = { status: 'down', ...indicatorDetails };
          }

          details[indicator.key] = indicatorDetails;
        } catch (error) {
          errors[indicator.key] = {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Run custom health checks
      const customPromises = this.customHealthChecks.map(async (check) => {
        try {
          const result = await check.check();
          if (result.status === 'up') {
            info[check.name] = result;
          } else {
            errors[check.name] = result;
          }
          details[check.name] = result;
        } catch (error) {
          errors[check.name] = {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Wait for all health checks to complete
      await Promise.all([...healthPromises, ...customPromises]);

      const hasErrors = Object.keys(errors).length > 0;
      const status = hasErrors ? 'error' : 'ok';

      return {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        info: Object.keys(info).length > 0 ? info : undefined,
        error: Object.keys(errors).length > 0 ? errors : undefined,
        details,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: {
          general: {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  /**
   * Readiness check - checks if the application is ready to serve requests
   */
  async readinessCheck(): Promise<HealthCheckResult> {
    try {
      // Only check critical services for readiness
      const isDatabaseHealthy = await this.databaseHealth.isHealthy();

      if (isDatabaseHealthy) {
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          info: {
            database: { status: 'up' },
          },
        };
      } else {
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          error: {
            database: { status: 'down' },
          },
        };
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: {
          readiness: {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  /**
   * Liveness check - simple check to see if the application is alive
   */
  async livenessCheck(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      info: {
        application: { status: 'up' },
      },
    };
  }

  /**
   * Get application info
   */
  async getApplicationInfo(): Promise<Record<string, any>> {
    const memoryUsage = process.memoryUsage();
    return {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || 'development',
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      cpuUsage: process.cpuUsage(),
    };
  }
}
