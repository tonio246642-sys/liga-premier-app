'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { Cinzel, Montserrat } from 'next/font/google';

// Configuración de fuentes
const fontLogo = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const fontBody = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

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
  
  // Carrusel Portada
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % PORTADA_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Carga de Datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Temporada Activa
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        if (!seasonSnap.empty) {
          const activeSeasonData = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
          setActiveSeason(activeSeasonData);

          // 2. Torneos y Equipos (Para agenda)
          const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeasonData.id));
          const tourSnap = await getDocs(tourQ);
          const activeTournamentIds = tourSnap.docs.map(d => d.id);

          const teamsSnap = await getDocs(collection(db, 'teams'));
          const teamsMap: any = {};
          teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
          setTeams(teamsMap);

          const matchesQ = query(collection(db, 'matches'), where('status', '==', 'scheduled'));
          const matchesSnap = await getDocs(matchesQ);
          
          const upcoming = matchesSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(m => activeTournamentIds.includes(m.tournamentId))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 4); 
          
          setNextMatches(upcoming);
        }
      } catch (error) { console.error(error); }
    };
    fetchData();
  }, []);

  return (
    <div className={`bg-black text-white antialiased selection:bg-white selection:text-black ${fontBody.className}`}>
      
      {/* NAVBAR SUPERIOR CENTRADO */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center text-white mix-blend-difference">
         {/* Espaciador izquierdo para equilibrar */}
         <div className="w-20 hidden md:block"></div>

         {/* LOGO CENTRAL (LIGA PREMIER) */}
         <div className={`${fontLogo.className} text-xl md:text-2xl font-bold tracking-[0.15em] uppercase text-center`}>
            LIGA PREMIER
         </div>

         {/* BOTÓN CALENDARIO (Derecha) */}
         <div className="w-20 flex justify-end">
            <Link href="/matches" className="hidden md:block text-[10px] font-bold uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all pb-1">
              Calendario
            </Link>
            {/* Icono móvil */}
            <Link href="/matches" className="md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </Link>
         </div>
      </nav>

      {/* --- PANTALLA 1: PORTADA EDITORIAL --- */}
      <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden">
        
        {/* Fondo Carrusel Oscuro */}
        <div className="absolute inset-0 z-0">
          {PORTADA_IMAGES.map((src, index) => (
            <img 
              key={index}
              src={src} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-50 scale-105' : 'opacity-0 scale-100'
              }`}
              alt="Portada" 
              style={{ filter: 'brightness(0.5)' }} // Filtro para oscurecer y que el texto resalte
            />
          ))}
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* CONTENIDO CENTRAL */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mt-10">
          
          {/* Nombre de la Temporada (Estilo Hennessy/Apple) */}
          <h1 className={`${fontLogo.className} text-5xl md:text-7xl lg:text-8xl text-white drop-shadow-2xl mb-8 tracking-wide animate-in fade-in zoom-in duration-1000 leading-tight`}>
            {activeSeason?.name || 'TEMPORADA 2026'}
          </h1>

          {/* Línea Divisoria Sutil */}
          <div className="h-px w-24 bg-white/40 mb-8"></div>

          {/* Subtítulo / Llamada a la acción */}
          <p className="text-sm md:text-lg font-light tracking-[0.2em] text-gray-200 opacity-90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Explora el rendimiento de la temporada
          </p>

        </div>

        {/* BOTTOM: Scroll Indicator */}
        <div className="absolute bottom-12 z-20 flex flex-col items-center gap-4 animate-pulse opacity-60">
           <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Descubre más</span>
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
           </svg>
        </div>
      </section>

      {/* --- SECCIÓN: AGENDA SEMANAL --- */}
      <section className="relative py-24 w-full bg-[#080808] border-t border-white/5">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-blue-500 mb-3 block">Calendario</span>
            <h2 className={`${fontLogo.className} text-3xl md:text-4xl text-white`}>Encuentros de la Semana</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextMatches.length > 0 ? (
              nextMatches.map((m) => (
                <Link href={`/matches/${m.id}`} key={m.id} className="group block">
                  <div className="relative p-6 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]">
                    <div className="flex justify-between items-center mb-6 opacity-40 text-[9px] font-bold uppercase tracking-[0.2em]">
                       <span>{new Date(m.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}</span>
                       <span>{m.field}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3 w-1/3">
                          <img src={teams[m.localTeamId]?.shieldUrl || teams[m.localTeamId]?.logoUrl} className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                          <span className="text-[10px] font-bold uppercase tracking-widest truncate">{teams[m.localTeamId]?.name}</span>
                       </div>
                       <div className="text-xs font-medium text-white/50 group-hover:text-white transition-colors">
                          {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                       <div className="flex items-center gap-3 w-1/3 flex-row-reverse text-right">
                          <img src={teams[m.awayTeamId]?.shieldUrl || teams[m.awayTeamId]?.logoUrl} className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                          <span className="text-[10px] font-bold uppercase tracking-widest truncate">{teams[m.awayTeamId]?.name}</span>
                       </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-16 text-center border-t border-b border-white/5">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
                  Sin partidos programados
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/matches" className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">
              Ver calendario completo →
            </Link>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN: TABLA --- */}
      <section className="relative h-[80vh] w-full flex items-center justify-center bg-neutral-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img src={TABLA_BG} className="w-full h-full object-cover opacity-30 grayscale" alt="" />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className={`${fontLogo.className} text-4xl md:text-6xl mb-4 text-white`}>Clasificación</h2>
          <p className="text-xs font-light text-gray-400 mb-8 tracking-wider max-w-md mx-auto">
            Consulta la posición actual de tu equipo y el camino hacia el campeonato.
          </p>
          <Link href="/standings" className="inline-block border border-white/20 px-8 py-3 text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-white hover:text-black transition-all">
            Ver Tabla
          </Link>
        </div>
      </section>

      {/* --- SECCIÓN: ESTADÍSTICAS --- */}
      <section className="relative h-[80vh] w-full flex items-center justify-center bg-black overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img src={STATS_BG} className="w-full h-full object-cover opacity-30 grayscale" alt="" />
           <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className={`${fontLogo.className} text-4xl md:text-6xl mb-4 text-white`}>Estadísticas</h2>
          <p className="text-xs font-light text-gray-400 mb-8 tracking-wider max-w-md mx-auto">
            Goleo individual, tarjetas y rendimiento detallado de la temporada.
          </p>
          <Link href="/stats" className="inline-block bg-white text-black px-8 py-3 text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-gray-200 transition-all">
            Ver Datos
          </Link>
        </div>
      </section>

    </div>
  );
}