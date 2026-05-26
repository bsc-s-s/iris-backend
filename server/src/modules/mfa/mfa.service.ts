import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import base32 from 'base32-encode';

@Injectable()
export class MfaService {
  constructor(private prisma: PrismaService) {}

  async generateSecret(userId: string) {
    const secret = crypto.randomBytes(20).toString('hex');
    const recoveryCodes = this.generateRecoveryCodes();

    // Store raw secret (no hashing — TOTP algorithm needs the original)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaRecoveryCodes: recoveryCodes.map((c) => crypto.createHash('sha256').update(c).digest('hex')),
        mfaEnabled: false,
      },
    });

    const secretBase32 = base32(Buffer.from(secret, 'hex'), 'RFC4648');
    return {
      secret,
      secretBase32,
      recoveryCodes,
      qrCodeUrl: `otpauth://totp/IRIS:${userId}?secret=${secretBase32}&issuer=IRIS%20Enterprise&algorithm=SHA1&digits=6&period=30`,
    };
  }

  async verifyAndEnable(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new UnauthorizedException('MFA no configurado');

    const isValid = this.verifyToken(token, user.mfaSecret);
    if (!isValid) throw new UnauthorizedException('Código TOTP inválido');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { verified: true, mfaEnabled: true };
  }

  async verify(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled) return true;
    if (!user?.mfaSecret) return false;

    // Check recovery codes
    if (token.length > 10 && user.mfaRecoveryCodes) {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const idx = user.mfaRecoveryCodes.indexOf(hashedToken);
      if (idx !== -1) {
        // Remove used recovery code
        const codes = [...user.mfaRecoveryCodes];
        codes.splice(idx, 1);
        await this.prisma.user.update({
          where: { id: userId },
          data: { mfaRecoveryCodes: codes },
        });
        return true;
      }
    }

    return this.verifyToken(token, user.mfaSecret);
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: null, mfaRecoveryCodes: [], mfaEnabled: false },
    });
    return { disabled: true };
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      enabled: user?.mfaEnabled ?? false,
      hasSecret: !!user?.mfaSecret,
      recoveryCodesCount: user?.mfaRecoveryCodes?.length ?? 0,
    };
  }

  private verifyToken(token: string, secret: string): boolean {
    // TOTP verification (RFC 6238 compatible)
    const counter = Math.floor(Date.now() / 30000);
    for (let i = -1; i <= 1; i++) {
      const expected = this.generateTOTP(secret, counter + i);
      if (token === expected) return true;
    }
    return false;
  }

  private generateTOTP(secret: string, counter: number): string {
    const buf = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      buf[i] = counter & 0xff;
      counter >>= 8;
    }
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    return String(code % 1000000).padStart(6, '0');
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
