import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

@ApiTags('monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();
      res.status(200).send(metrics);
    } catch (error) {
      // Return empty metrics instead of error to prevent Prometheus scraping issues
      res.status(200).send('# Error collecting metrics\n');
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get metrics summary for debugging' })
  @ApiResponse({ status: 200, description: 'Metrics summary in JSON format' })
  @ApiExcludeEndpoint(process.env.NODE_ENV === 'production')
  getSummary() {
    // Get summary from service (which already includes timestamp and environment)
    const summary = this.metricsService.getMetricsSummary();

    return {
      ...summary,
      // Add additional controller-level information
      nodeVersion: process.version,
      platform: process.platform,
    };
  }
}
