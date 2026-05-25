"use client";

import { useState, useEffect } from "react";
import { CheckCircle, CreditCard, Sparkles, Building2, Users, BarChart3, Infinity, Shield, Headphones, Globe, Clock, Zap } from "lucide-react";
import { v1 } from "@/lib/api";

const PLAN_ICONS: Record<string, any> = { starter: Zap, professional: Sparkles, enterprise: Building2 };

const PLAN_FEATURES: Record<string, Record<string, any>> = {
  starter: {
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    badge: "Starter",
    priceLabel: "€299",
  },
  professional: {
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    badge: "Professional",
    priceLabel: "€999",
  },
  enterprise: {
    icon: Building2,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "Enterprise",
    priceLabel: "€4.999",
  },
};

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => {
    v1.billing.plans().then((data) => { setPlans(data); setLoading(false); }).catch(() => setLoading(false));
    const org = localStorage.getItem("iris_org");
    if (org) try { setCurrentPlan(JSON.parse(org).plan || "free"); } catch {}
  }, []);

  const handleCheckout = async (planId: string) => {
    try {
      const successUrl = `${window.location.origin}/billing?success=true`;
      const cancelUrl = `${window.location.origin}/billing?canceled=true`;
      const session = await v1.billing.checkout({ planId, successUrl, cancelUrl });
      if (session.url) window.location.href = session.url;
    } catch (e: any) {
      alert(e.message || "Error al iniciar checkout");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Facturación</h1>
        <p className="mt-1 text-sm text-iris-400">Planes de suscripción y gestión de facturación</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-iris-400" />
          <div>
            <p className="text-sm font-medium text-white">Plan actual: <span className="uppercase text-iris-accent">{currentPlan}</span></p>
            <p className="text-xs text-iris-400">Los pagos se procesan de forma segura a través de Stripe</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-400 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const meta = PLAN_FEATURES[plan.id] || {};
            const Icon = meta.icon || CreditCard;
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = plan.id === "professional" || plan.id === "enterprise";
            return (
              <div key={plan.id} className={`card relative flex flex-col ${meta.border} ${isCurrent ? "ring-2 ring-iris-accent" : ""}`}>
                {isCurrent && <span className="absolute -top-2.5 right-4 rounded-full bg-iris-accent px-3 py-0.5 text-[10px] font-semibold text-white">Actual</span>}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${meta.bg}`}>
                  <Icon className={`h-6 w-6 ${meta.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white">{meta.badge || plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${meta.color}`}>{meta.priceLabel || `€${(plan.price / 100).toLocaleString()}`}</span>
                  <span className="text-sm text-iris-400">/{plan.interval === "year" ? "año" : "mes"}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features?.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-iris-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-iris-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent}
                  className={`btn mt-6 w-full ${isCurrent ? "btn-ghost cursor-not-allowed opacity-50" : isUpgrade ? "btn-primary" : "btn-secondary"}`}
                >
                  {isCurrent ? "Plan actual" : isUpgrade ? "Suscribirse" : "Comenzar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
