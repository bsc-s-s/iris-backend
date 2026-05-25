import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS || "")}@${process.env.DB_HOST}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "postgres"}?sslmode=require`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
