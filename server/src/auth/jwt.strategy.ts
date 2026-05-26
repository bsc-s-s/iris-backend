import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'iris-jwt-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; organizationId: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true, organizationId: true, isActive: true } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');
    return { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId, name: user.name };
  }
}
