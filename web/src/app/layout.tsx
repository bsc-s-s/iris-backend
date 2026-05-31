import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "IRIS Enterprise - Arquitectura de Riesgo y Seguridad Integral",
  description: "Plataforma enterprise de evaluación, planificación y simulación de riesgos de seguridad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
