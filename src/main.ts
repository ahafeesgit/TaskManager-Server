import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
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
