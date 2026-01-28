'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/config'; // Asegúrate de exportar 'auth' en tu config
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeSeason, setActiveSeason] = useState<string>('Cargando...');
  const [stats, setStats] = useState({ teams: 0, matches: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Obtener nombre de temporada activa
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        if (!seasonSnap.empty) {
          setActiveSeason(seasonSnap.docs[0].data().name);
        } else {
          setActiveSeason("Sin temporada activa");
        }

        // 2. Contadores rápidos (Opcional, para que se vea vivo)
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const matchesSnap = await getDocs(query(collection(db, 'matches'), where('status', '==', 'scheduled')));
        
        setStats({
          teams: teamsSnap.size,
          matches: matchesSnap.size
        });

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Encabezado Admin */}
      <header className="bg-slate-900 text-white p-8 rounded-b-[40px] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Panel de Control</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Administrador</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Tarjeta de Estado Rápido */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Temporada Actual</p>
            <p className="text-xl font-black text-white italic">{activeSeason}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Partidos Pendientes</p>
            <p className="text-xl font-black text-blue-400">{stats.matches}</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto -mt-6 space-y-8">
        
        {/* GRUPO 1: Estructura de la Liga */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Configuración</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashboardCard 
              href="/admin/seasons" 
              icon="🏆" 
              title="Temporadas" 
              desc="Crear y activar torneos" 
              color="bg-purple-600"
            />
            <DashboardCard 
              href="/admin/tournaments" 
              icon="md" 
              title="Torneos" 
              desc="Categorías y grupos" 
              color="bg-indigo-600"
            />
            <DashboardCard 
              href="/admin/matchdays" 
              icon="📅" 
              title="Jornadas" 
              desc="Generar fechas" 
              color="bg-blue-600"
            />
          </div>
        </section>

        {/* GRUPO 2: Gestión Deportiva */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Gestión Deportiva</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashboardCard 
              href="/admin/teams" 
              icon="🛡️" 
              title="Equipos" 
              desc={`${stats.teams} registrados`} 
              color="bg-emerald-600"
            />
            <DashboardCard 
              href="/admin/players" 
              icon="🏃" 
              title="Jugadores" 
              desc="Altas y bajas" 
              color="bg-teal-600"
            />
             <DashboardCard 
              href="/admin/enrollment" 
              icon="📝" 
              title="Inscripciones" 
              desc="Solicitudes nuevas" 
              color="bg-cyan-600"
            />
          </div>
        </section>

        {/* GRUPO 3: Operación Diaria */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Día de Partido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashboardCard 
              href="/admin/matches" 
              icon="⚽" 
              title="Partidos" 
              desc="Registrar resultados" 
              color="bg-orange-500"
            />
            <DashboardCard 
              href="/admin/standings" 
              icon="📊" 
              title="Tabla General" 
              desc="Ver clasificación" 
              color="bg-amber-500"
            />
            <DashboardCard 
              href="/admin/notices" 
              icon="📢" 
              title="Avisos" 
              desc="Noticias oficiales" 
              color="bg-rose-500"
            />
          </div>
        </section>

      </main>
    </div>
  );
}

// Componente auxiliar para las tarjetas
function DashboardCard({ href, icon, title, desc, color }: any) {
  return (
    <Link href={href} className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition group">
      <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center text-xl mb-3 shadow-md group-hover:scale-110 transition`}>
        {icon}
      </div>
      <h3 className="font-black text-slate-800 uppercase text-sm">{title}</h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase">{desc}</p>
    </Link>
  );
}