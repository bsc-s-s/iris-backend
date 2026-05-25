import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const dbUrl = env("DATABASE_URL") || 
  `postgresql://${env("DB_USER")}:${encodeURIComponent(env("DB_PASS") || "")}@${env("DB_HOST")}:${env("DB_PORT") || "5432"}/${env("DB_NAME") || "postgres"}?sslmode=require`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
