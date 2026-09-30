import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is needed later to verify Clerk and Stripe webhook signatures
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();