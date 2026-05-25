import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import * as client from 'openid-client';
import * as samlify from 'samlify';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  getProviders() {
    return [
      { id: 'google', name: 'Google Workspace', type: 'oidc', icon: 'google', description: 'Google Workspace (Gmail, Google Apps)' },
      { id: 'microsoft', name: 'Microsoft Entra ID', type: 'oidc', icon: 'microsoft', description: 'Microsoft Entra ID (Azure AD)' },
      { id: 'oidc', name: 'OpenID Connect', type: 'oidc', icon: 'openid', description: 'Cualquier proveedor OIDC compatible' },
      { id: 'saml', name: 'SAML 2.0', type: 'saml', icon: 'saml', description: 'SAML 2.0 (Okta, OneLogin, ADFS, etc.)' },
    ];
  }

  async getConfig(organizationId: string) {
    return this.prisma.ssoConfig.findMany({
      where: { organizationId },
      select: { id: true, provider: true, issuer: true, entryPoint: true, enabled: true, clientId: true, certificate: true },
    });
  }

  async saveConfig(organizationId: string, data: {
    provider: string; issuer: string; entryPoint: string;
    certificate?: string; clientId?: string; clientSecret?: string; enabled: boolean;
  }) {
    return this.prisma.ssoConfig.upsert({
      where: { organizationId_provider: { organizationId, provider: data.provider } },
      create: { ...data, organizationId },
      update: data,
    });
  }

  async deleteConfig(organizationId: string, provider: string) {
    return this.prisma.ssoConfig.delete({
      where: { organizationId_provider: { organizationId, provider } },
    });
  }

  async initiateLogin(provider: string, orgSlug: string | undefined, baseUrl: string) {
    const org = await this.prisma.organization.findFirst({
      where: orgSlug ? { slug: orgSlug } : { id: process.env.DEFAULT_ORG_ID || undefined },
    });
    if (!org) throw new BadRequestException('Organization not found');

    if (provider === 'saml') {
      return this.initiateSamlLogin(org.id, baseUrl);
    }

    return this.initiateOidcLogin(provider, org.id, baseUrl);
  }

  async handleOidcCallback(provider: string, params: Record<string, string>, baseUrl: string) {
    const { code, state } = params;
    if (!code || !state) throw new BadRequestException('Missing code or state');

    const stored = this.getState(state);
    if (!stored) throw new UnauthorizedException('Invalid or expired state parameter');

    const orgId = stored.orgId;
    const config = await this.prisma.ssoConfig.findFirst({
      where: { organizationId: orgId, provider, enabled: true },
    });
    if (!config) throw new BadRequestException(`SSO provider ${provider} not configured`);

    try {
      const server = new URL(config.issuer || process.env[`SSO_${provider.toUpperCase()}_ISSUER`] || '');
      const clientId = config.clientId || process.env[`SSO_${provider.toUpperCase()}_CLIENT_ID`] || '';
      const clientSecret = config.clientSecret || process.env[`SSO_${provider.toUpperCase()}_CLIENT_SECRET`] || '';

      const oidcConfig = await client.discovery(server, clientId, clientSecret);

      const callbackUrl = `${baseUrl}/api/v1/sso/callback/${provider}`;
      const currentUrl = new URL(`${callbackUrl}?code=${code}&state=${state}`);

      const tokens = await client.authorizationCodeGrant(
        oidcConfig,
        currentUrl,
        { pkceCodeVerifier: stored.codeVerifier, expectedState: state, expectedNonce: stored.nonce },
      );

      let email = '';
      let name = '';

      if (tokens.id_token) {
        const parts = tokens.id_token.split('.');
        if (parts.length !== 3) throw new UnauthorizedException('Invalid ID token');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        email = payload.email || payload.preferred_username || '';
        name = payload.name || payload.given_name || payload.preferred_username || email.split('@')[0] || 'SSO User';
      } else {
        const userInfo = await client.fetchUserInfo(oidcConfig, tokens.access_token, tokens.id_token!);
        email = userInfo.email || userInfo.preferred_username || '';
        name = userInfo.name || userInfo.given_name || email.split('@')[0] || 'SSO User';
      }

      if (!email) throw new UnauthorizedException('Email not provided by identity provider');

      const user = await this.findOrCreateUser(email, name, orgId);
      const jwtTokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId);
      this.deleteState(state);

      return {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    } catch (err: any) {
      this.logger.error(`OIDC callback error: ${err.message}`);
      throw new UnauthorizedException('SSO authentication failed: ' + err.message);
    }
  }

  async handleSamlCallback(body: Record<string, string>, baseUrl: string) {
    const samlResponse = body.SAMLResponse;
    if (!samlResponse) throw new BadRequestException('Missing SAMLResponse');

    const config = await this.prisma.ssoConfig.findFirst({ where: { provider: 'saml', enabled: true } });
    if (!config) throw new BadRequestException('SAML provider not configured');

    try {
      const sp = samlify.ServiceProvider({
        entityID: `${baseUrl}/api/v1/sso/callback/saml`,
        assertionConsumerService: [{
          Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          Location: `${baseUrl}/api/v1/sso/callback/saml`,
        }],
      });

      const idp = samlify.IdentityProvider({
        entityID: config.issuer,
        singleSignOnService: [{ Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect', Location: config.entryPoint }],
        signingCert: config.certificate || '',
      });

      const result = await sp.parseLoginResponse(idp, 'post', { body: { SAMLResponse: samlResponse } });
      const attrs = result.extract.attributes || {};
      const rawEmail = attrs.email || attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      const rawName = attrs.name || attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
      const email = Array.isArray(rawEmail) ? rawEmail[0] : (rawEmail || '');
      const name = Array.isArray(rawName) ? rawName[0] : (rawName || email.split('@')[0] || 'SSO User');

      if (!email) throw new UnauthorizedException('Email not provided by SAML IdP');

      const user = await this.findOrCreateUser(email, name, config.organizationId);
      const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    } catch (err: any) {
      this.logger.error(`SAML callback error: ${err.message}`);
      throw new UnauthorizedException('SAML authentication failed: ' + err.message);
    }
  }

  private async initiateOidcLogin(provider: string, orgId: string, baseUrl: string) {
    const config = await this.prisma.ssoConfig.findFirst({ where: { organizationId: orgId, provider, enabled: true } });
    if (!config) throw new BadRequestException(`SSO provider ${provider} not configured for this organization`);

    const issuerUrl = config.issuer || process.env[`SSO_${provider.toUpperCase()}_ISSUER`] || '';
    const clientId = config.clientId || process.env[`SSO_${provider.toUpperCase()}_CLIENT_ID`] || '';
    const clientSecret = config.clientSecret || process.env[`SSO_${provider.toUpperCase()}_CLIENT_SECRET`] || '';

    if (!issuerUrl || !clientId) {
      throw new BadRequestException(`SSO provider ${provider} is not fully configured (missing issuer or clientId)`);
    }

    const server = new URL(issuerUrl);
    const oidcConfig = await client.discovery(server, clientId, clientSecret);

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    const redirectUri = `${baseUrl}/api/v1/sso/callback/${provider}`;

    const parameters: Record<string, string> = {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    };

    const redirectTo = client.buildAuthorizationUrl(oidcConfig, parameters);

    this.saveState(state, { provider, nonce, orgId, codeVerifier });

    return { redirectUrl: redirectTo.href };
  }

  private async initiateSamlLogin(orgId: string, baseUrl: string) {
    const config = await this.prisma.ssoConfig.findFirst({ where: { organizationId: orgId, provider: 'saml', enabled: true } });
    if (!config) throw new BadRequestException('SAML provider not configured for this organization');

    const sp = samlify.ServiceProvider({
      entityID: `${baseUrl}/api/v1/sso/callback/saml`,
      assertionConsumerService: [{
        Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
        Location: `${baseUrl}/api/v1/sso/callback/saml`,
      }],
    });

    const idp = samlify.IdentityProvider({
      entityID: config.issuer,
      singleSignOnService: [{ Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect', Location: config.entryPoint }],
      signingCert: config.certificate || '',
    });

    const { context } = sp.createLoginRequest(idp, 'redirect');
    return { redirectUrl: context };
  }

  private async findOrCreateUser(email: string, name: string, organizationId: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await bcrypt.hash(uuid(), 12),
          role: 'viewer',
          organizationId,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  private async generateTokens(userId: string, email: string, role: string, organizationId: string) {
    const payload = { sub: userId, email, role, organizationId };
    const accessToken = this.jwt.sign(payload, { expiresIn: (process.env.JWT_EXPIRATION || '15m') as any });
    const refreshToken = uuid();

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return { accessToken, refreshToken };
  }

  private saveState(state: string, data: any) {
    if (!(global as any).__ssoStates) (global as any).__ssoStates = new Map();
    (global as any).__ssoStates.set(state, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
  }

  private getState(state: string) {
    const map = (global as any).__ssoStates;
    if (!map) return null;
    const stored = map.get(state);
    if (!stored || stored.expiresAt < Date.now()) {
      map.delete(state);
      return null;
    }
    return stored;
  }

  private deleteState(state: string) {
    (global as any).__ssoStates?.delete(state);
  }
}
