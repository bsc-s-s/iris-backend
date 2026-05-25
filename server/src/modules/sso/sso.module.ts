import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'iris-jwt-secret',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '15m') as any },
    }),
  ],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
