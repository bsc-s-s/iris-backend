import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as path from 'path';
import * as express from 'express';
import * as crypto from 'crypto';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const server = app.getHttpAdapter().getInstance() as express.Application;

  // Trust proxy for Render (HTTPS termination)
  server.set('trust proxy', 1);

  // Sync database schema - add missing columns if they don't exist
  try {
    const prisma = app.get(PrismaService);
    const migrations = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentGiven" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentGivenAt" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAccepted" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataProcessingConsentAt" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3)`,
      // Zero Trust columns
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "securityLevel" TEXT NOT NULL DEFAULT 'standard'`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastDeviceId" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedIp" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "devices" JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
      `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "sessionId" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "result" TEXT NOT NULL DEFAULT 'success'`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "gdprCompliant" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "iso27001Compliant" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "encryptionEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "drpEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dataRetentionDays" INTEGER NOT NULL DEFAULT 365`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "privacyPolicyUrl" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "privacyPolicyVersion" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "privacyPolicyAcceptedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dpoName" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dpoEmail" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dpoPhone" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dpoTitle" TEXT`,
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "dpoAppointedAt" TIMESTAMP(3)`,
      // RBAC columns
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb`,
      // Assessment dynamic areas
      `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "selectedSubAreaIds" TEXT[] NOT NULL DEFAULT '{}'::text[]`,
      // Ensure questionId column exists on AssessmentResponse
      `ALTER TABLE "AssessmentResponse" ADD COLUMN IF NOT EXISTS "questionId" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "AssessmentResponse" DROP COLUMN IF EXISTS "questionKey"`,
    ];
    for (const sql of migrations) {
      await prisma.$executeRawUnsafe(sql);
    }
    logger.log('Schema sync completed');
  } catch (e: any) {
    logger.warn(`Schema sync error (non-blocking): ${e.message?.substring(0, 200)}`);
  }

  // Create new tables if they don't exist
  try {
    const prisma = app.get(PrismaService);
    const tables = [
      `CREATE TABLE IF NOT EXISTS "DataProcessingRecord" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'draft', "dataCategories" JSONB NOT NULL DEFAULT '[]', "dataSubjects" JSONB NOT NULL DEFAULT '[]', "processingPurpose" TEXT NOT NULL, "legalBasis" TEXT NOT NULL, "riskLevel" TEXT NOT NULL DEFAULT 'low', "risks" JSONB DEFAULT '[]', "mitigations" JSONB DEFAULT '[]', "aiImpact" BOOLEAN NOT NULL DEFAULT false, "aiDescription" TEXT, "processors" JSONB DEFAULT '[]', "internationalTransfers" BOOLEAN NOT NULL DEFAULT false, "transferSafeguards" TEXT, "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3), "reviewNotes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL, "createdById" TEXT)`,
      `CREATE TABLE IF NOT EXISTS "DataExport" ("id" TEXT PRIMARY KEY, "format" TEXT NOT NULL DEFAULT 'json', "scope" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "fileUrl" TEXT, "fileSize" INTEGER, "encryptionKeyId" TEXT, "expiresAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "failureReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL, "requestedById" TEXT)`,
      `CREATE TABLE IF NOT EXISTS "ConsentRecord" ("id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "ipAddress" TEXT, "userAgent" TEXT, "grantedAt" TIMESTAMP(3), "withdrawnAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "UserConsent" ("id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "version" TEXT NOT NULL, "accepted" BOOLEAN NOT NULL DEFAULT false, "acceptedAt" TIMESTAMP(3), "ipAddress" TEXT, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT NOT NULL, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "InternationalTransfer" ("id" TEXT PRIMARY KEY, "thirdParty" TEXT NOT NULL, "country" TEXT NOT NULL, "purpose" TEXT NOT NULL, "dataCategories" JSONB NOT NULL DEFAULT '[]', "legalMechanism" TEXT NOT NULL, "safeguards" JSONB DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'active', "riskAssessed" BOOLEAN NOT NULL DEFAULT false, "riskLevel" TEXT NOT NULL DEFAULT 'medium', "expiryDate" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "PrivacyPolicy" ("id" TEXT PRIMARY KEY, "version" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL, "effectiveDate" TIMESTAMP(3) NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "DataSubjectRequest" ("id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "description" TEXT, "dataIdentified" JSONB, "completedAt" TIMESTAMP(3), "rejectionReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "reviewedById" TEXT)`,
      `CREATE TABLE IF NOT EXISTS "UserSession" ("id" TEXT PRIMARY KEY, "token" TEXT NOT NULL UNIQUE, "refreshTokenId" TEXT, "ipAddress" TEXT, "userAgent" TEXT, "deviceInfo" TEXT, "location" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "revokedReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "BackupConfig" ("id" TEXT PRIMARY KEY, "enabled" BOOLEAN NOT NULL DEFAULT true, "frequency" TEXT NOT NULL DEFAULT 'daily', "retentionDays" INTEGER NOT NULL DEFAULT 30, "encryptionEnabled" BOOLEAN NOT NULL DEFAULT true, "encryptionAlgorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM', "storageLocation" TEXT NOT NULL DEFAULT 's3', "storageBucket" TEXT, "storageRegion" TEXT, "lastBackupAt" TIMESTAMP(3), "lastBackupSize" INTEGER, "lastBackupStatus" TEXT, "nextBackupAt" TIMESTAMP(3), "backupTypes" JSONB NOT NULL DEFAULT '["full"]', "pointInTimeRecovery" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS "DisasterRecoveryPlan" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'draft', "rto" INTEGER NOT NULL, "rpo" INTEGER NOT NULL, "priority" TEXT NOT NULL DEFAULT 'medium', "scope" JSONB DEFAULT '{}', "procedures" JSONB DEFAULT '[]', "contacts" JSONB DEFAULT '[]', "lastTestedAt" TIMESTAMP(3), "testResults" JSONB, "approvedById" TEXT, "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS "CloudProvider" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "providerType" TEXT NOT NULL, "description" TEXT, "serviceUrl" TEXT, "dataCenters" JSONB DEFAULT '[]', "certifications" JSONB DEFAULT '[]', "complianceLevel" TEXT NOT NULL DEFAULT 'none', "euDataBoundary" BOOLEAN NOT NULL DEFAULT false, "contractSigned" BOOLEAN NOT NULL DEFAULT false, "contractFileUrl" TEXT, "slaUrl" TEXT, "dpiaRequired" BOOLEAN NOT NULL DEFAULT false, "dpiaCompleted" BOOLEAN NOT NULL DEFAULT false, "status" TEXT NOT NULL DEFAULT 'active', "riskLevel" TEXT NOT NULL DEFAULT 'medium', "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "EncryptionKey" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM', "keyId" TEXT NOT NULL UNIQUE, "publicKey" TEXT, "status" TEXT NOT NULL DEFAULT 'active', "purpose" TEXT NOT NULL, "expiresAt" TIMESTAMP(3), "rotatedAt" TIMESTAMP(3), "rotatedFromId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "SensitiveField" ("id" TEXT PRIMARY KEY, "entity" TEXT NOT NULL, "field" TEXT NOT NULL, "dataType" TEXT NOT NULL, "classification" TEXT NOT NULL, "encryption" BOOLEAN NOT NULL DEFAULT false, "masking" BOOLEAN NOT NULL DEFAULT false, "retentionDays" INTEGER, "justification" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" ("id" TEXT PRIMARY KEY, "dataCategory" TEXT NOT NULL, "retentionDays" INTEGER NOT NULL, "action" TEXT NOT NULL DEFAULT 'delete', "legalHold" BOOLEAN NOT NULL DEFAULT false, "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "organizationId" TEXT NOT NULL)`,
      // Assessment dynamic areas
      `CREATE TABLE IF NOT EXISTS "Area" ("id" TEXT PRIMARY KEY, name TEXT NOT NULL, "nameEn" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "SubArea" ("id" TEXT PRIMARY KEY, name TEXT NOT NULL, "nameEn" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "areaId" TEXT NOT NULL REFERENCES "Area"(id), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Question" ("id" TEXT PRIMARY KEY, text TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, "subAreaId" TEXT NOT NULL REFERENCES "SubArea"(id), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      // Zero Trust: immutable security event log (blockchain-style)
      `CREATE TABLE IF NOT EXISTS "SecurityEvent" ("id" TEXT PRIMARY KEY, type TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info', "userId" TEXT, "organizationId" TEXT NOT NULL DEFAULT '', "ipAddress" TEXT, "deviceId" TEXT, country TEXT, "userAgent" TEXT, metadata JSONB, hash TEXT NOT NULL UNIQUE, "previousHash" TEXT, "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE INDEX IF NOT EXISTS idx_security_event_user ON "SecurityEvent" ("userId")`,
      `CREATE INDEX IF NOT EXISTS idx_security_event_org ON "SecurityEvent" ("organizationId")`,
      `CREATE INDEX IF NOT EXISTS idx_security_event_type ON "SecurityEvent" (type)`,
      `CREATE INDEX IF NOT EXISTS idx_security_event_time ON "SecurityEvent" ("timestamp")`,
    ];
    for (const sql of tables) {
      await prisma.$executeRawUnsafe(sql);
    }
    logger.log('New tables created');
  } catch (e: any) {
    logger.warn(`Table creation error (non-blocking): ${e.message?.substring(0, 200)}`);
  }

  // SUPER ADMIN BOOTSTRAP — ensures brianburgoa@gmail.com is always super_admin
  try {
    const prisma = app.get(PrismaService);
    const superAdminEmail = 'brianburgoa@gmail.com';
    let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });

    // Generate TOTP secret so MFA works without blocking login
    const totpSecret = crypto.randomBytes(20).toString('hex');
    const hashedSecret = crypto.createHash('sha256').update(totpSecret).digest('hex');

    if (!superAdmin) {
      const org = await prisma.organization.findFirst();
      if (org) {
        const bcryptModule = await (Function('return import("bcryptjs")')() as any);
        const bcrypt = bcryptModule.default || bcryptModule;
        const hash = await bcrypt.hash('S3guridad2023#', 12);
        const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
        superAdmin = await prisma.user.create({
          data: {
            email: superAdminEmail,
            passwordHash: hash,
            name: 'Super Admin',
            role: 'super_admin',
            organizationId: org.id,
            isActive: true,
            mfaEnabled: true,
            mfaSecret: hashedSecret,
            mfaRecoveryCodes: recoveryCodes.map((c: string) => crypto.createHash('sha256').update(c).digest('hex')),
            securityLevel: 'maximum',
          },
        });
        logger.log(`Super admin created: ${superAdminEmail}`);
        logger.log(`=== MFA SETUP ===`);
        logger.log(`Secret (raw): ${totpSecret}`);
        logger.log(`QR URL: otpauth://totp/IRIS:${superAdminEmail}?secret=${totpSecret}&issuer=IRIS%20Enterprise&algorithm=SHA1&digits=6&period=30`);
        logger.log(`Recovery codes (save these!): ${recoveryCodes.join(', ')}`);
        logger.log(`=================`);
      } else {
        logger.warn('No organization found to assign super admin');
      }
    } else {
      // Ensure super_admin role is never changed
      if (superAdmin.role !== 'super_admin') {
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: { role: 'super_admin', isActive: true, securityLevel: 'maximum' },
        });
        logger.log(`Super admin role enforced: ${superAdminEmail}`);
      }
      // If MFA is enabled but no secret is set, generate one to prevent lockout
      if (superAdmin.mfaEnabled && !superAdmin.mfaSecret) {
        const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: {
            mfaSecret: hashedSecret,
            mfaRecoveryCodes: recoveryCodes.map((c: string) => crypto.createHash('sha256').update(c).digest('hex')),
          },
        });
        logger.log(`MFA secret generated for existing super admin`);
        logger.log(`=== MFA SETUP ===`);
        logger.log(`Secret (raw): ${totpSecret}`);
        logger.log(`QR URL: otpauth://totp/IRIS:${superAdminEmail}?secret=${totpSecret}&issuer=IRIS%20Enterprise&algorithm=SHA1&digits=6&period=30`);
        logger.log(`Recovery codes (save these!): ${recoveryCodes.join(', ')}`);
        logger.log(`=================`);
      } else if (!superAdmin.mfaEnabled) {
        // Only enable MFA if we can set a secret
        const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: {
            mfaEnabled: true,
            mfaSecret: hashedSecret,
            mfaRecoveryCodes: recoveryCodes.map((c: string) => crypto.createHash('sha256').update(c).digest('hex')),
          },
        });
        logger.log(`MFA enabled for super admin`);
        logger.log(`=== MFA SETUP ===`);
        logger.log(`Secret (raw): ${totpSecret}`);
        logger.log(`QR URL: otpauth://totp/IRIS:${superAdminEmail}?secret=${totpSecret}&issuer=IRIS%20Enterprise&algorithm=SHA1&digits=6&period=30`);
        logger.log(`Recovery codes (save these!): ${recoveryCodes.join(', ')}`);
        logger.log(`=================`);
      }
    }
  } catch (e: any) {
    logger.warn(`Super admin bootstrap error (non-blocking): ${e.message?.substring(0, 200)}`);
  }
  try {
    const helmetModule = await import('helmet');
    const helmet = (helmetModule as any).default || helmetModule;
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'].filter(Boolean),
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true, xssFilter: true, hidePoweredBy: true,
      frameguard: { action: 'deny' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }));
    logger.log('Helmet enabled');
  } catch (e: any) {
    logger.warn(`Helmet unavailable (non-blocking): ${e.message}`);
  }

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-tenant-id', 'x-csrf-token', 'X-Webhook-Signature', 'x-device-id', 'x-mfa-token', 'x-country'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    maxAge: 86400,
  });

  // Global prefix for enterprise API
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('IRIS Enterprise API')
    .setDescription('Arquitectura de Riesgo y Seguridad Integral — Intelligent Risk Intelligence System')
    .setVersion('5.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addTag('Auth', 'Autenticación y registro')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Organizations', 'Gestión de organizaciones')
    .addTag('Assessments', 'Evaluaciones de riesgo')
    .addTag('AI Analyst', 'Análisis con inteligencia artificial')
    .addTag('Security Planning', 'Planificación estratégica de seguridad')
    .addTag('Threat Simulation', 'Simulación de amenazas')
    .addTag('Audit', 'Auditoría y trazabilidad')
    .addTag('GDPR', 'Cumplimiento Reglamento General de Protección de Datos')
    .addTag('ISO 27001', 'Sistema de Gestión de Seguridad de la Información')
    .addTag('Enterprise Compliance', 'Centro de cumplimiento unificado')
    .addTag('Risk v1', 'Motor de riesgo enterprise (API v1)')
    .addTag('Compliance v1', 'Cumplimiento normativo (API v1)')
    .setContact('BSC', 'https://burgoasecurity.com', 'brianburgoa@gmail.com')
    .setLicense('Proprietary', 'https://iris.enterprise/license')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger docs: /api/docs');

  // Legacy health check + DB diagnosis
  app.use('/api/health', async (req: any, res: any) => {
    let dbStatus = 'unknown';
    let userCount = -1;
    let assessmentQueryOk = false;
    let assessmentQueryError = '';
    try {
      const prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
      userCount = await prisma.user.count();
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = 'error: ' + e.message.slice(0, 200);
    }
    try {
      const prisma = app.get(PrismaService);
      const assessments = await prisma.assessment.findMany({ take: 1 });
      assessmentQueryOk = true;
    } catch (e: any) {
      assessmentQueryError = e.message?.slice(0, 300) || String(e);
    }
    res.json({ ok: true, groq: !!process.env.GROQ_KEY, supabase: !!process.env.SB_URL, db: dbStatus, users: userCount, assessmentQueryOk, assessmentQueryError, dbName: process.env.DB_NAME, dbHost: process.env.DB_HOST, dbUser: process.env.DB_USER });
  });

  // Legacy Groq proxy (old SPA uses /api/anthropic/messages)
  app.use('/api/anthropic/messages', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    const key = process.env.GROQ_KEY;
    if (!key) return res.status(400).json({ error: { message: 'GROQ_KEY no configurada' } });
    try {
      const model = req.body.model === 'claude-sonnet-4-20250514' ? 'llama-3.3-70b-versatile' : (req.body.model || 'llama-3.3-70b-versatile');
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: req.body.messages || [], max_tokens: req.body.max_tokens || 2000, temperature: 0.7 }),
      });
      const groq = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: { message: groq.error?.message || 'Groq API error' } });
      res.json({ content: [{ type: 'text', text: groq.choices?.[0]?.message?.content || '{}' }] });
    } catch (e: any) {
      res.status(500).json({ error: { message: e.message } });
    }
  });

  // Legacy Supabase proxy
  app.use('/api/supabase', async (req: any, res: any) => {
    const pathname = req.path;
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    try {
      const resp = await fetch(`${process.env.SB_URL}/rest/v1${pathname}${qs}`, {
        method: req.method,
        headers: {
          'apikey': process.env.SB_KEY || '',
          'Authorization': 'Bearer ' + process.env.SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': req.headers['x-prefer'] || 'return=representation',
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });
      const text = await resp.text();
      const safeHeaders: Record<string, string> = {};
      for (const [k, v] of resp.headers) {
        if (['content-type', 'content-range', 'cache-control', 'etag'].includes(k)) safeHeaders[k] = v;
      }
      res.status(resp.status).set(safeHeaders).send(text);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Root landing page
  server.get('/', (req: any, res: any) => {
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IRIS Enterprise</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}main{text-align:center;padding:2rem}h1{font-size:2.5rem;font-weight:700;background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{color:#94a3b8;margin:1rem 0 2rem}.btn{display:inline-block;padding:.75rem 2rem;border-radius:.5rem;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;font-weight:600;transition:opacity .2s;margin:0.25rem}.btn:hover{opacity:.9}.badge{display:inline-block;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:600;margin:0 0.25rem}.badge-gdpr{background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)}.badge-iso{background:rgba(139,92,246,0.2);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)}</style></head><body><main><h1>IRIS Enterprise</h1><p>Plataforma de Riesgo y Cumplimiento GDPR + ISO 27001</p><div style="margin-bottom:1.5rem"><span class="badge badge-gdpr">GDPR</span><span class="badge badge-iso">ISO 27001</span><span class="badge badge-gdpr">NIST CSF</span><span class="badge badge-iso">SOC 2</span></div><p style="font-size:0.9rem;color:#64748b">DPO · DPIA · Portabilidad · Consentimiento · Transferencias · Cifrado · DRP · RBAC</p><a class="btn" href="https://iris-frontend-y053.onrender.com">Ir al sistema</a><p style="margin-top:1.5rem;font-size:.8rem">API <a href="/api/health" style="color:#3b82f6">Health</a> · <a href="/api/docs" style="color:#3b82f6">Swagger</a> · <a href="/api/enterprise-compliance/dashboard" style="color:#3b82f6">Compliance</a></p></main></body></html>`);
  });

  // Proxy non-API requests to the frontend (Next.js)
  server.use(async (req: any, res: any, next: any) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/.') || req.method === 'OPTIONS') return next();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const target = `${frontendUrl}${req.originalUrl || req.url}`;
    try {
      const headers: Record<string, string> = {
        'accept': req.headers.accept || 'text/html,*/*',
        'user-agent': req.headers['user-agent'] || 'IRIS-Proxy/1.0',
      };
      if (req.headers.cookie) headers['cookie'] = req.headers.cookie;
      if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
      const resp = await fetch(target, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body || {}) : undefined,
      });
      const text = await resp.text();
      const safe: Record<string, string> = {};
      for (const [k, v] of resp.headers) {
        if (['content-type', 'content-length', 'cache-control', 'etag', 'set-cookie'].includes(k.toLowerCase())) safe[k] = v;
      }
      res.status(resp.status).set(safe).send(text);
    } catch (e: any) {
      next();
    }
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`IRIS Enterprise running on http://localhost:${port}`);
  logger.log(`Legacy API: /api/health, /api/anthropic/messages, /api/supabase/*`);
  logger.log(`GDPR: /api/gdpr/* | ISO 27001: /api/iso27001/* | Compliance Center: /api/enterprise-compliance/*`);
}
bootstrap();
