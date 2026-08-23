import { Global, Module } from '@nestjs/common';
import { ENV, loadedEnv } from './configuration';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: loadedEnv }],
  exports: [ENV],
})
export class EnvModule {}
