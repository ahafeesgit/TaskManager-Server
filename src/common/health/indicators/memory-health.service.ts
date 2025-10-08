import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  MemoryHealthIndicator,
} from '../interfaces/health-check.interface';

@Injectable()
export class MemoryHealthService implements MemoryHealthIndicator {
  readonly key = 'memory';

  async isHealthy(): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const heapThreshold = 150 * 1024 * 1024; // 150MB
    const rssThreshold = 200 * 1024 * 1024; // 200MB

    return (
      memoryUsage.heapUsed < heapThreshold && memoryUsage.rss < rssThreshold
    );
  }

  async checkHeapMemory(
    threshold: number = 150 * 1024 * 1024,
  ): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed < threshold;
  }

  async checkRSSMemory(
    threshold: number = 200 * 1024 * 1024,
  ): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.rss < threshold;
  }

  async getDetails(): Promise<Record<string, any>> {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: {
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        humanReadable: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      heapTotal: {
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        humanReadable: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      rss: {
        value: memoryUsage.rss,
        unit: 'bytes',
        humanReadable: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      external: {
        value: memoryUsage.external,
        unit: 'bytes',
        humanReadable: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
    };
  }
}
