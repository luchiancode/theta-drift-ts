import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/configuration';
import { EnvModule } from './config/env.module';
import { ControllersModule } from './controllers/controllers.module';
import { SchedulerModule } from './services/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['apps/theta-drift-api/.env', '.env'],
      validate: validateEnv,
    }),
    EnvModule,
    ControllersModule,
    SchedulerModule,
  ],
})
export class AppModule {}
