import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IRIS Enterprise - Arquitectura de Riesgo y Seguridad Integral",
  description: "Plataforma enterprise de evaluación, planificación y simulación de riesgos de seguridad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
