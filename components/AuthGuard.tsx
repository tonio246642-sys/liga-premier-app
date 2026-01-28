'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("🛡️ AuthGuard activo en:", pathname);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("👤 Estado de usuario:", user ? "Logueado" : "Invitado");

      // CASO A: Es una ruta de admin, NO es el login y NO hay usuario
      if (!user && pathname.startsWith('/admin') && !pathname.includes('/login')) {
        console.log("⛔ Acceso denegado. Redirigiendo forzosamente...");
        router.replace('/admin/login'); 
        // ¡IMPORTANTE! NO ponemos setLoading(false) aquí. 
        // Dejamos que cargue infinitamente hasta que la redirección ocurra.
        return; 
      }
      
      // CASO B: Ya estás logueado e intentas ver el login
      if (user && pathname.includes('/login')) {
        console.log("✅ Usuario ya logueado. Redirigiendo al dashboard...");
        router.replace('/admin/dashboard');
        return;
      }

      // CASO C: Todo correcto, mostrar contenido
      console.log("🔓 Acceso permitido.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // Pantalla de Bloqueo (Spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white z-50 fixed inset-0">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest animate-pulse text-xs">Verificando Permisos...</p>
      </div>
    );
  }

  return <>{children}</>;
}