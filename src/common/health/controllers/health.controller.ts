import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import { Public } from '../decorators/public.decorator';
import { HealthCheckResult } from '../interfaces/health-check.interface';

@ApiTags('Health')
@Controller('health')
@Public() // Make all health endpoints public
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Comprehensive health check',
    description: 'Returns detailed health status of all application components',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more health checks failed',
  })
  async check(): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    return result;
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks if the application is ready to serve requests (Kubernetes readiness probe)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async readiness(): Promise<HealthCheckResult> {
    const result = await this.healthService.readinessCheck();
    return result;
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Checks if the application is alive (Kubernetes liveness probe)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  async liveness(): Promise<HealthCheckResult> {
    return this.healthService.livenessCheck();
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Application information',
    description: 'Returns application runtime information and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Application info retrieved successfully',
  })
  async info(): Promise<Record<string, any>> {
    return this.healthService.getApplicationInfo();
  }
}
