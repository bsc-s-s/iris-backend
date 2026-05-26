import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const server = app.getHttpAdapter().getInstance() as express.Application;

  // Trust proxy for Render (HTTPS termination)
  server.set('trust proxy', 1);

  // Security headers with Helmet (dynamic import for ESM compat)
  try {
    const helmet = await import('helmet');
    app.use(helmet.default({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
      frameguard: { action: 'deny' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }));
    logger.log('Helmet security headers enabled');
  } catch (e: any) {
    logger.warn(`Helmet not available: ${e.message}`);
  }

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-tenant-id', 'x-csrf-token', 'X-Webhook-Signature'],
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
    try {
      const prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
      userCount = await prisma.user.count();
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = 'error: ' + e.message.slice(0, 200);
    }
    res.json({ ok: true, groq: !!process.env.GROQ_KEY, supabase: !!process.env.SB_URL, db: dbStatus, users: userCount, dbName: process.env.DB_NAME, dbHost: process.env.DB_HOST, dbUser: process.env.DB_USER });
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`IRIS Enterprise running on http://localhost:${port}`);
  logger.log(`Legacy API: /api/health, /api/anthropic/messages, /api/supabase/*`);
  logger.log(`GDPR: /api/gdpr/* | ISO 27001: /api/iso27001/* | Compliance Center: /api/enterprise-compliance/*`);
}
bootstrap();
