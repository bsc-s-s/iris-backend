import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.emhqfkdeeuqgojvjonkg",
  password: "S3guridad2023#",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding IRIS Enterprise database...");

  const org = await prisma.organization.upsert({
    where: { slug: "iris-demo" },
    update: {},
    create: {
      name: "IRIS Demo Corp",
      slug: "iris-demo",
      plan: "enterprise",
      settings: { riskCategories: ["fisica","corporativa","ejecutiva","operacional","financiero","geopolitico","reputacional","digital_ciber","insider","continuidad","inteligencia","compliance"], language: "es", timezone: "America/La_Paz" },
    },
  });

  const passwordHash = await bcrypt.hash("S3guridad2023#", 12);

  const admin = await prisma.user.upsert({
    where: { email: "brianburgoa@gmail.com" },
    update: {},
    create: { email: "brianburgoa@gmail.com", passwordHash, name: "Dr. Brian Burgoa", role: "admin", title: "Director de Seguridad", organizationId: org.id },
  });

  await prisma.user.upsert({
    where: { email: "analyst@iris.demo" },
    update: {},
    create: { email: "analyst@iris.demo", passwordHash, name: "Analista Demo", role: "analyst", title: "Analista de Riesgos", organizationId: org.id },
  });

  const facility = await prisma.facility.upsert({
    where: { id: "demo-facility-001" },
    update: {},
    create: { id: "demo-facility-001", name: "Oficina Central La Paz", type: "headquarters", address: "Av. Arce #1234", country: "Bolivia", city: "La Paz", riskLevel: "medium", organizationId: org.id },
  });

  const protocols = [
    { name: "Control de Acceso Fisico", category: "physical", priority: "critical", description: "Control biometrico" },
    { name: "Seguridad Perimetral", category: "physical", priority: "high", description: "Vigilancia perimetral" },
    { name: "Politica Seguridad Informatica", category: "logical", priority: "critical", description: "ISO 27001" },
    { name: "Plan Continuidad Negocio", category: "operational", priority: "high", description: "BCP 4h recuperacion" },
    { name: "Gestion Incidentes", category: "operational", priority: "medium", description: "Procedimientos documentados" },
  ];

  for (const pt of protocols) {
    const pid = "demo-protocol-" + pt.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    await prisma.securityProtocol.upsert({
      where: { id: pid },
      update: {},
      create: { id: pid, ...pt, status: "active", effectiveness: "medium", organizationId: org.id, implementation: { milestones: [{ phase: 1, action: "Evaluacion inicial", timeframe: "30 dias" }] } },
    });
  }

  const demoAssessment = await prisma.assessment.upsert({
    where: { id: "demo-assessment-001" },
    update: {},
    create: {
      id: "demo-assessment-001", title: "Evaluacion Integral de Riesgos 2026", status: "completed", methodology: "iris-v4", completedAt: new Date(),
      organizationId: org.id, facilityId: facility.id, createdById: admin.id,
      scores: {
        categories: {
          fisica: { total: 8, count: 4, avg: 2.0, severity: "low" },
          corporativa: { total: 10, count: 4, avg: 2.5, severity: "low" },
          ejecutiva: { total: 14, count: 4, avg: 3.5, severity: "medium" },
          operacional: { total: 12, count: 4, avg: 3.0, severity: "medium" },
          financiero: { total: 6, count: 4, avg: 1.5, severity: "low" },
          geopolitico: { total: 16, count: 4, avg: 4.0, severity: "high" },
          reputacional: { total: 10, count: 4, avg: 2.5, severity: "low" },
          digital_ciber: { total: 18, count: 4, avg: 4.5, severity: "critical" },
          insider: { total: 12, count: 4, avg: 3.0, severity: "medium" },
          continuidad: { total: 14, count: 4, avg: 3.5, severity: "medium" },
          inteligencia: { total: 8, count: 4, avg: 2.0, severity: "low" },
          compliance: { total: 10, count: 4, avg: 2.5, severity: "low" },
        },
        overall: { avg: 2.88, severity: "medium" },
        totalResponses: 48,
      },
      recommendations: [
        "Implementar medidas de ciberseguridad avanzadas (severidad critica)",
        "Desarrollar inteligencia geopolitica para operaciones internacionales",
        "Fortalecer planes de continuidad de negocio",
      ],
    },
  });

  const vulns = [
    { category: "digital_ciber", name: "Firewall sin actualizar", severity: "critical" },
    { category: "digital_ciber", name: "Falta autenticacion multifactor", severity: "high" },
    { category: "geopolitico", name: "Sin analisis riesgos pais", severity: "high" },
    { category: "ejecutiva", name: "Sucesion ejecutiva no documentada", severity: "medium" },
    { category: "continuidad", name: "BCP no probado en 12 meses", severity: "medium" },
  ];

  for (const v of vulns) {
    await prisma.vulnerability.create({
      data: { ...v, description: "Vulnerabilidad: " + v.name, status: "open", assessmentId: demoAssessment.id },
    });
  }

  console.log("Seed complete");
  console.log("  Org:", org.name);
  console.log("  Admin:", admin.email);
  console.log("  Login: brianburgoa@gmail.com / S3guridad2023#");
}

main().catch((e) => { console.error("Seed error:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
