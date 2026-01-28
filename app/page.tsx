'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
// Importamos una fuente de lujo (Serif) directamente de Google Fonts
import { Cinzel, Montserrat } from 'next/font/google';

// Configuración de fuentes premium
const fontLuxury = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const fontModern = Montserrat({ subsets: ['latin'], weight: ['300', '400', '600'] });

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

          // 2. Torneos de la temporada (para filtrar partidos)
          const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeasonData.id));
          const tourSnap = await getDocs(tourQ);
          const activeTournamentIds = tourSnap.docs.map(d => d.id);

          // 3. Equipos
          const teamsSnap = await getDocs(collection(db, 'teams'));
          const teamsMap: any = {};
          teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
          setTeams(teamsMap);

          // 4. Próximos Partidos
          const matchesQ = query(collection(db, 'matches'), where('status', '==', 'scheduled'));
          const matchesSnap = await getDocs(matchesQ);
          
          const upcoming = matchesSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(m => activeTournamentIds.includes(m.tournamentId))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 4); 
          
          setNextMatches(upcoming);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className={`bg-black text-white antialiased selection:bg-white selection:text-black ${fontModern.className}`}>
      
      {/* NAVBAR FLOTANTE MINIMALISTA */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-8 flex justify-end items-center mix-blend-difference text-white">
        <Link href="/matches" className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black hover:border-white px-6 py-2 rounded-sm transition-all duration-300">
          Calendario
        </Link>
      </nav>

      {/* --- PANTALLA 1: PORTADA HENNESSY STYLE --- */}
      <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden">
        
        {/* Fondo Carrusel con Overlay Oscuro Premium */}
        <div className="absolute inset-0 z-0">
          {PORTADA_IMAGES.map((src, index) => (
            <img 
              key={index}
              src={src} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-60 scale-105' : 'opacity-0 scale-100'
              }`}
              alt="Portada" 
              style={{ filter: 'brightness(0.6) contrast(1.1)' }}
            />
          ))}
          {/* Degradado Radial para enfocar el centro */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/90"></div>
        </div>

        {/* CONTENIDO CENTRAL */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-5xl">
          
          {/* TÍTULO PRINCIPAL (Tipografía Serif de Lujo) */}
          <h1 className={`${fontLuxury.className} text-7xl md:text-9xl lg:text-[11rem] leading-[0.85] text-white drop-shadow-2xl mb-12 animate-in fade-in zoom-in duration-1000`}>
            LIGA <br/> PREMIER
          </h1>

          {/* TEMPORADA ACTIVA (Estilo Líneas Divisoras) */}
          <div className="flex items-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
             <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-white/60"></div>
             <p className="text-xs md:text-sm font-medium uppercase tracking-[0.4em] text-gray-200 whitespace-nowrap">
                 {activeSeason?.name || 'TEMPORADA 2024'}
             </p>
             <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-white/60"></div>
          </div>

        </div>

        {/* BOTTOM: DESLIZA PARA EXPLORAR */}
        <div className="absolute bottom-12 z-20 flex flex-col items-center gap-3 animate-pulse opacity-80">
           <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/70">
              Desliza para explorar las estadísticas
           </p>
           <div className="h-12 w-px bg-gradient-to-b from-white to-transparent"></div>
        </div>
      </section>

      {/* --- SECCIÓN: PRÓXIMOS JUEGOS (Minimalista) --- */}
      <section className="relative py-32 w-full bg-[#0a0a0a] border-t border-white/5">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-2">Agenda Semanal</span>
            <h2 className={`${fontLuxury.className} text-4xl md:text-5xl text-white`}>Próximos Encuentros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nextMatches.length > 0 ? (
              nextMatches.map((m) => (
                <Link href={`/matches/${m.id}`} key={m.id} className="group block">
                  <div className="relative p-8 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-500 hover:bg-white/[0.04]">
                    <div className="flex justify-between items-center mb-8 opacity-60 text-[9px] font-bold uppercase tracking-[0.2em]">
                       <span>{new Date(m.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}</span>
                       <span>{m.field || 'Estadio Principal'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex flex-col items-center gap-2">
                          <img src={teams[m.localTeamId]?.shieldUrl || teams[m.localTeamId]?.logoUrl} className="w-12 h-12 object-contain grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{teams[m.localTeamId]?.name}</span>
                       </div>
                       <div className="text-xl font-light text-white/30 group-hover:text-white transition-colors duration-500">
                          {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                       <div className="flex flex-col items-center gap-2">
                          <img src={teams[m.awayTeamId]?.shieldUrl || teams[m.awayTeamId]?.logoUrl} className="w-12 h-12 object-contain grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{teams[m.awayTeamId]?.name}</span>
                       </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-t border-b border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                  No hay partidos programados
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/matches" className="inline-block text-[9px] font-bold uppercase tracking-[0.3em] text-white border-b border-transparent hover:border-white transition-all pb-1">
              Ver Calendario Completo
            </Link>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN: TABLA GENERAL (Imagen de Fondo) --- */}
      <section className="relative h-screen w-full flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img src={TABLA_BG} className="w-full h-full object-cover" alt="Fondo Tabla" style={{ filter: 'grayscale(100%) brightness(0.4)' }} />
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className={`${fontLuxury.className} text-5xl md:text-7xl mb-6 text-white`}>Tabla General</h2>
          <p className="text-sm font-light text-gray-300 max-w-lg mx-auto mb-10 leading-relaxed opacity-80">
            El camino a la gloria se construye partido a partido. Revisa las posiciones oficiales.
          </p>
          <Link href="/standings" className="bg-white text-black text-xs font-bold uppercase tracking-[0.2em] px-8 py-3 hover:bg-gray-200 transition-colors">
            Ver Posiciones
          </Link>
        </div>
      </section>

      {/* --- SECCIÓN: ESTADÍSTICAS --- */}
      <section className="relative h-screen w-full flex items-center justify-center bg-[#050505]">
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={STATS_BG} className="w-full h-full object-cover" alt="Fondo Stats" style={{ filter: 'grayscale(100%)' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 px-6 max-w-6xl mx-auto">
          <div className="text-center md:text-left">
            <h2 className={`${fontLuxury.className} text-5xl md:text-7xl mb-4 text-white`}>Líderes</h2>
            <div className="h-px w-20 bg-white mb-6 mx-auto md:mx-0"></div>
            <p className="text-sm font-light text-gray-400 max-w-md leading-relaxed mb-8">
              Goleadores, asistencias y tarjetas. Datos precisos para el análisis profundo del juego.
            </p>
            <Link href="/stats" className="border border-white/30 text-white text-xs font-bold uppercase tracking-[0.2em] px-8 py-3 hover:bg-white hover:text-black transition-all">
              Consultar Datos
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}