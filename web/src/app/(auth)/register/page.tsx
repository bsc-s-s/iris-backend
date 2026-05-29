"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-iris-900">
      <p className="text-sm text-iris-400">Registro deshabilitado. Redirigiendo...</p>
    </div>
  );
}
