import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('IRIS Enterprise API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
          expect(res.body.db).toBeDefined();
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'brianburgoa@gmail.com', password: 'S3guridad2023#' })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('brianburgoa@gmail.com');
          adminToken = res.body.accessToken;
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'brianburgoa@gmail.com', password: 'wrong' })
        .expect(401);
    });
  });

  describe('GET /api/v1/risk/score', () => {
    it('should return risk score for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/risk/score')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.overallScore).toBeDefined();
          expect(res.body.overallLevel).toBeDefined();
          expect(res.body.categories).toBeDefined();
        });
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/risk/score')
        .expect(401);
    });
  });

  describe('POST /api/v1/risk/analyze', () => {
    it('should analyze risk factors', () => {
      return request(app.getHttpServer())
        .post('/api/v1/risk/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ factors: [{ name: 'Test factor', severity: 4, category: 'security' }], categoryScores: { security: 80 } })
        .expect(201)
        .expect((res) => {
          expect(res.body.overallScore).toBeGreaterThan(0);
          expect(res.body.factors.length).toBe(1);
        });
    });
  });

  describe('GET /api/v1/compliance/gdpr', () => {
    it('should return GDPR compliance status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/compliance/gdpr')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.framework).toBe('GDPR');
          expect(res.body.score).toBeDefined();
          expect(res.body.controls.length).toBe(10);
        });
    });
  });

  describe('GET /api/v1/compliance/iso27001', () => {
    it('should return ISO 27001 compliance status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/compliance/iso27001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.framework).toBe('ISO 27001');
          expect(res.body.score).toBeDefined();
          expect(res.body.controls.length).toBe(10);
        });
    });
  });

  describe('POST /api/v1/risk/predict', () => {
    it('should return forecast from scores', () => {
      return request(app.getHttpServer())
        .post('/api/v1/risk/predict')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scores: [{ date: '2026-01-01', score: 50 }, { date: '2026-02-01', score: 60 }, { date: '2026-03-01', score: 55 }] })
        .expect(201)
        .expect((res) => {
          expect(res.body.riskForecast['days_30']).toBeDefined();
          expect(res.body.riskForecast['days_60']).toBeDefined();
          expect(res.body.riskForecast['days_90']).toBeDefined();
          expect(res.body.trend).toBeDefined();
        });
    });
  });

  describe('POST /api/v1/anomalies/detect', () => {
    it('should detect anomalies from events', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anomalies/detect')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          events: [{ type: 'login', userId: 'u1', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() }],
          metrics: [{ metric: 'error_rate', value: 50, timestamp: new Date().toISOString() }, { metric: 'error_rate', value: 2, timestamp: new Date(Date.now() - 86400000).toISOString() }],
          timeRange: { start: new Date(Date.now() - 86400000 * 7).toISOString(), end: new Date().toISOString() },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.anomaliesDetected).toBeDefined();
          expect(res.body.patterns).toBeDefined();
        });
    });
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard analytics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.stats).toBeDefined();
          expect(res.body.forecast).toBeDefined();
        });
    });
  });

  describe('GET /api/v1/billing/plans', () => {
    it('should return available plans', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);
        });
    });
  });
});
