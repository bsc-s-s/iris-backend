import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const server = app.getHttpAdapter().getInstance() as express.Application;

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global prefix for enterprise API
  app.setGlobalPrefix('api');

  // Body parser for legacy routes
  server.use(express.json());

  // Legacy health check
  app.use('/api/health', (req: any, res: any) => {
    res.json({ ok: true, groq: !!process.env.GROQ_KEY, supabase: !!process.env.SB_URL });
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

  // Serve old SPA from public/
  server.use(express.static(path.join(__dirname, '../../public')));

  // SPA fallback: serve index.html for non-API GET requests
  server.use((req: any, res: any, next: any) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/_next')) {
      res.sendFile(path.join(__dirname, '../../public/index.html'), (err: any) => { if (err) next(); });
    } else {
      next();
    }
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`IRIS Enterprise running on http://localhost:${port}`);
  logger.log(`Serving legacy SPA from public/`);
  logger.log(`Legacy API: /api/health, /api/anthropic/messages, /api/supabase/*`);
}
bootstrap();
