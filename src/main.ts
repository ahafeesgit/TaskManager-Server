import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/**
 * Validates critical environment variables on startup
 * Fails fast if required secrets are missing
 */
function validateEnvironment() {
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please set these in your .env file');
    process.exit(1);
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET as string;
    if (jwtSecret.length < 32) {
      console.error(
        '❌ FATAL: JWT_SECRET must be at least 32 characters in production',
      );
      console.error(
        "💡 Generate a strong secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
      );
      process.exit(1);
    }
  }

  console.log('✅ Environment validation passed');
}

async function bootstrap() {
  // Validate critical environment variables
  validateEnvironment();

  const app = await NestFactory.create(AppModule);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  // Enable global validation pipe (class-validator & class-transformer)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable security and utility middleware
  app.use(helmet());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser() as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(compression() as any);

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) =>
    origin.trim(),
  ) || ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(
          `⚠️  Blocked CORS request from unauthorized origin: ${origin}`,
        );
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME || 'API Documentation')
    .setDescription(process.env.APP_DESCRIPTION || 'The API description')
    .setVersion(process.env.APP_VERSION || '1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Local server')
    .addServer('https://your-production-domain.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(process.env.SWAGGER_PATH || 'api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `🚀 Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/${process.env.SWAGGER_PATH || 'api'}`,
  );
}

bootstrap().catch((error: unknown) => {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('Error starting the application:', errorMessage);
  if (errorStack) {
    console.error('Stack trace:', errorStack);
  }
  process.exit(1);
});
