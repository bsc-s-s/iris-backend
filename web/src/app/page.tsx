import Link from "next/link";

const FEATURES = [
  { title: "Evaluación de Riesgos", desc: "Scoring multidimensional en 12 categorías con generación automática de planes de remediación." },
  { title: "Planificación Estratégica", desc: "Roadmaps multi-anuales con KPIs, presupuestos y asignación de recursos." },
  { title: "Simulación de Amenazas", desc: "6 tipos de amenaza con análisis de probabilidad, impacto y mitigaciones." },
  { title: "AI Analyst", desc: "Asistente inteligente con Groq Llama 3.3 para análisis contextual de seguridad." },
  { title: "Multi-tenant", desc: "Gestión de múltiples organizaciones, facilities y usuarios con RBAC." },
  { title: "Auditoría", desc: "Trazabilidad completa de acciones y estadísticas de actividad." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-iris-900">
      <nav className="flex items-center justify-between border-b border-iris-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo-sm.png" alt="IRIS" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold text-white">IRIS Enterprise</span>
        </div>
        <Link href="/login" className="btn btn-primary text-sm">Ingresar</Link>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <img src="/logo-md.png" alt="IRIS" className="mx-auto mb-8 h-28 w-28 object-contain" />
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Arquitectura de Riesgo y <span className="text-iris-accent">Seguridad Integral</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-iris-400">
          Plataforma enterprise para evaluar, planificar y simular estrategias de seguridad corporativa con inteligencia artificial integrada.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/login" className="btn btn-primary px-8 py-3 text-base">
            Ingresar al sistema
          </Link>
          <Link href="/register" className="btn btn-ghost px-8 py-3 text-base text-iris-300 hover:text-white">
            Solicitar acceso
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-iris-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-iris-600 px-6 py-6 text-center text-xs text-iris-500">
        Burgoa Security Consultant &middot; IRIS Enterprise v5 &middot; Acceso restringido
      </footer>
    </div>
  );
}
