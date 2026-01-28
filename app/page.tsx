'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

// --- TUS IMÁGENES ---
const PORTADA_IMAGES = [
  '/foto1.jpg', 
  '/foto2.png'
];
const TABLA_BG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=2566&auto=format&fit=crop'; 
const STATS_BG = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2566&auto=format&fit=crop'; 

export default function HomePage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [nextMatches, setNextMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Carrusel Portada
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % PORTADA_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Carga de Datos CON FILTRO MAESTRO
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Temporada Activa
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        
        if (seasonSnap.empty) {
            setLoading(false);
            return;
        }

        const activeSeasonData = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(activeSeasonData);

        // 2. BUSCAR TORNEOS DE ESTA TEMPORADA (Para filtrar los partidos)
        const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeasonData.id));
        const tourSnap = await getDocs(tourQ);
        const activeTournamentIds = tourSnap.docs.map(d => d.id);

        // 3. Equipos
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsMap: any = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
        setTeams(teamsMap);

        // 4. Próximos Partidos (Scheduled)
        // Traemos todos los programados y filtramos en memoria por el ID del torneo
        const matchesQ = query(collection(db, 'matches'), where('status', '==', 'scheduled'));
        const matchesSnap = await getDocs(matchesQ);
        
        const upcoming = matchesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(m => activeTournamentIds.includes(m.tournamentId)) // <--- FILTRO CLAVE
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 4); 
        
        setNextMatches(upcoming);

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-black text-white font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR FLOTANTE */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-8 flex justify-end items-center mix-blend-difference text-white">
        <Link href="/matches" className="text-xs font-medium bg-white/20 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white/40 transition-all">
          Calendario
        </Link>
      </nav>

      {/* --- PANTALLA 1: PORTADA --- */}
      <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {PORTADA_IMAGES.map((src, index) => (
            <img 
              key={index}
              src={src} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-70' : 'opacity-0'
              }`}
              alt="Portada" 
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80"></div>
        </div>

        <div className="absolute top-24 left-8 z-20 animate-in fade-in slide-in-from-left-4 duration-1000">
             <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/60">
                 {activeSeason?.name || 'TEMPORADA ACTIVA'}
             </p>
        </div>

        <div className="relative z-10 text-center px-4 flex flex-col items-center">
          <h1 className="text-8xl md:text-[10rem] lg:text-[12rem] font-extrabold tracking-tighter leading-none text-white mb-6 drop-shadow-2xl">
            LIGA <br/> PREMIER
          </h1>
          <p className="text-xl md:text-3xl text-gray-200 font-medium tracking-tight opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            Haz historia.
          </p>
        </div>

        <div className="absolute bottom-12 animate-bounce opacity-70">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
           </svg>
        </div>
      </section>

      {/* --- SECCIÓN: PRÓXIMOS JUEGOS --- */}
      <section className="relative py-24 w-full bg-neutral-900 border-t border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter text-white">Esta Semana.</h2>
              <p className="text-sm text-gray-400 font-medium mt-2">Los duelos decisivos que vienen.</p>
            </div>
            <Link href="/matches" className="text-xs font-bold uppercase tracking-widest text-blue-500 hover:text-white transition-colors">
              Ver Todo &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextMatches.length > 0 ? (
              nextMatches.map((m) => (
                <Link href={`/matches/${m.id}`} key={m.id} className="group block">
                  <div className="relative p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:scale-[1.02] transition-all duration-300">
                    <div className="flex justify-between items-center mb-6 opacity-50 text-[10px] font-bold uppercase tracking-widest">
                       <span>{new Date(m.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}</span>
                       <span>{m.field || 'Campo Principal'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg">
                             <img src={teams[m.localTeamId]?.shieldUrl || teams[m.localTeamId]?.logoUrl} className="w-full h-full object-contain" alt="" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wide">{teams[m.localTeamId]?.name}</span>
                       </div>
                       <div className="px-3 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] font-bold text-white">
                          {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                       <div className="flex items-center gap-3 flex-row-reverse text-right">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg">
                             <img src={teams[m.awayTeamId]?.shieldUrl || teams[m.awayTeamId]?.logoUrl} className="w-full h-full object-contain" alt="" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wide">{teams[m.awayTeamId]?.name}</span>
                       </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  No hay partidos de esta temporada programados
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- PANTALLA 2: TABLA GENERAL --- */}
      <section className="relative min-h-screen w-full flex items-center border-t border-white/10">
        <div className="absolute inset-0 z-0 bg-black">
          <img src={TABLA_BG} className="w-full h-full object-cover opacity-50 grayscale" alt="Fondo Tabla" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>
        <div className="relative z-10 container mx-auto px-8 md:px-12 grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col items-start justify-center space-y-6">
            <h2 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-none">Tabla <br/> General.</h2>
            <p className="text-lg md:text-xl text-gray-300 font-normal leading-relaxed max-w-md">Sigue la competencia punto a punto.</p>
            <Link href="/standings" className="group mt-4 relative inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold text-sm transition-transform active:scale-95 hover:bg-gray-100">
              Ver Posiciones
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* --- PANTALLA 3: STATS --- */}
      <section className="relative min-h-screen w-full flex items-center border-t border-white/10">
        <div className="absolute inset-0 z-0 bg-black">
          <img src={STATS_BG} className="w-full h-full object-cover opacity-50" alt="Fondo Stats" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        </div>
        <div className="relative z-10 container mx-auto px-8 md:px-12 grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col items-start justify-center space-y-6">
            <h2 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-none text-white">Líderes <br/> y Datos.</h2>
            <p className="text-lg md:text-xl text-gray-300 font-normal leading-relaxed max-w-md">Analiza el rendimiento, los goleadores y las tarjetas.</p>
            <Link href="/stats" className="group mt-4 relative inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/30 rounded-full text-white font-semibold text-sm transition-all hover:bg-white/20 active:scale-95">
              Explorar Estadísticas
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}