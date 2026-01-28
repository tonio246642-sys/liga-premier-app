'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function TeamsDirectory() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const snap = await getDocs(collection(db, 'teams'));
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error al cargar equipos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase italic">Cargando Equipos...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-indigo-950 text-white p-10 rounded-b-[50px] shadow-2xl">
        <h1 className="text-3xl font-black uppercase italic leading-none">Nuestros <br/><span className="text-blue-500">Equipos</span></h1>
        <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-2">Temporada 2026</p>
      </header>

      <main className="p-6 grid grid-cols-2 gap-4 -mt-8">
        {teams.map(t => (
          <Link href={`/teams/${t.id}`} key={t.id} className="bg-white p-6 rounded-[35px] shadow-lg border border-slate-100 flex flex-col items-center text-center active:scale-95 transition group">
            <div className="w-20 h-20 flex items-center justify-center mb-4 transition group-hover:scale-110">
              <img src={t.shieldUrl || t.logoUrl} className="max-w-full max-h-full object-contain" alt={t.name} />
            </div>
            <span className="font-black text-[11px] uppercase text-slate-800 leading-tight">{t.name}</span>
            <span className="text-[8px] font-bold text-blue-500 mt-2 uppercase tracking-widest">Ver Plantilla →</span>
          </Link>
        ))}
      </main>

      {/* Menú de navegación inferior (Opcional si ya lo tienes en layout) */}
    </div>
  );
}