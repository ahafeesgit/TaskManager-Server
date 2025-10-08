import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { DiskHealthIndicator } from '../interfaces/health-check.interface';

@Injectable()
export class DiskHealthService implements DiskHealthIndicator {
  readonly key = 'disk';

  async isHealthy(): Promise<boolean> {
    try {
      return await this.checkDiskSpace('/', 0.9); // 90% threshold
    } catch (error) {
      return false;
    }
  }

  async checkDiskSpace(
    path: string = '/',
    thresholdPercent: number = 0.9,
  ): Promise<boolean> {
    try {
      const stats = await fs.statfs(path);
      if (!stats) {
        // Fallback for systems that don't support statfs
        return true;
      }

      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedPercent = (totalSpace - freeSpace) / totalSpace;

      return usedPercent < thresholdPercent;
    } catch (error) {
      // If we can't check disk space, assume it's healthy to avoid false negatives
      return true;
    }
  }

  async getDetails(): Promise<Record<string, any>> {
    try {
      const stats = await fs.statfs('/');
      if (!stats) {
        return {
          status: 'unavailable',
          message: 'Disk statistics not available on this system',
        };
      }

      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const usedPercent = (usedSpace / totalSpace) * 100;

      return {
        total: {
          value: totalSpace,
          unit: 'bytes',
          humanReadable: this.formatBytes(totalSpace),
        },
        free: {
          value: freeSpace,
          unit: 'bytes',
          humanReadable: this.formatBytes(freeSpace),
        },
        used: {
          value: usedSpace,
          unit: 'bytes',
          humanReadable: this.formatBytes(usedSpace),
        },
        usedPercent: {
          value: usedPercent,
          unit: 'percent',
          humanReadable: `${usedPercent.toFixed(1)}%`,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve disk statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
