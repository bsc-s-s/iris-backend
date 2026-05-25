"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    if (!token || !refresh) {
      setStatus("error");
      setErrorMsg("Invalid SSO response: missing token");
      return;
    }

    localStorage.setItem("iris_token", token);
    localStorage.setItem("iris_refresh", refresh);

    api.auth
      .me()
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message || "Error validating session");
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-iris-900 px-4">
      <div className="w-full max-w-sm text-center">
        <img src="/logo-md.png" alt="IRIS" className="mx-auto mb-6 h-20 w-20 object-contain" />

        {status === "processing" && (
          <div className="card space-y-4 py-8">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-iris-accent" />
            <p className="text-sm text-iris-200">Verificando autenticacion SSO...</p>
          </div>
        )}

        {status === "success" && (
          <div className="card space-y-4 py-8">
            <CheckCircle className="mx-auto h-10 w-10 text-iris-success" />
            <p className="text-sm font-medium text-white">SSO exitoso</p>
            <p className="text-xs text-iris-400">Redirigiendo al dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="card space-y-4 py-8">
            <XCircle className="mx-auto h-10 w-10 text-iris-danger" />
            <p className="text-sm font-medium text-white">Error de autenticacion SSO</p>
            <p className="text-xs text-iris-400">{errorMsg}</p>
            <Link href="/login" className="btn btn-primary mt-4 inline-block">
              Volver al login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-iris-900 px-4">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-iris-accent" />
        <p className="mt-4 text-sm text-iris-200">Verificando autenticacion SSO...</p>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <SsoCallbackContent />
    </Suspense>
  );
}
