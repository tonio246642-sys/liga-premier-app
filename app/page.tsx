'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'; // Agregamos doc y setDoc
import { getMessaging, getToken } from "firebase/messaging"; // Importamos mensajería
import Link from 'next/link';
import { Cinzel, Inter } from 'next/font/google';

// Configuración de fuentes
const fontLogo = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const fontApple = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

const PORTADA_IMAGES = [
  '/foto1.jpg', 
  '/foto2.png'
];
const TABLA_BG = 'https://images.unsplash.com/photo-1521733610321-4199933079b3?q=80&w=2000&auto=format&fit=crop'; 
const STATS_BG = 'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2000&auto=format&fit=crop'; 

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

  // --- LÓGICA DE NOTIFICACIONES PUSH ---
  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Verificamos que estemos en el navegador y que soporte notificaciones
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
        try {
          const messaging = getMessaging();
          
          // 2. Pedimos permiso al usuario
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            console.log("Permiso de notificaciones concedido.");

            // 3. Obtenemos el Token (Identificador único del celular/PC)
            const currentToken = await getToken(messaging, {
              // IMPORTANTE: REEMPLAZA ESTO CON TU 'KEY PAIR' DE FIREBASE CONSOLE -> CLOUD MESSAGING -> WEB PUSH
              vapidKey: 'BH9zH9o98qiozAsD-EBRQfcU1vIwuxKNQqhHfV1VuxB0uhm3Pz3dILTlxp1fxO8blLMJHu-ipnRAmG_8YHJ2Z_8' 
            });

            if (currentToken) {
              console.log("Token obtenido:", currentToken);
              
              // 4. Guardamos el token en Firestore
              // Usamos el mismo token como ID del documento para evitar duplicados
              await setDoc(doc(db, "fcm_tokens", currentToken), {
                token: currentToken,
                createdAt: new Date(),
                userAgent: navigator.userAgent, // Para saber si es iPhone, Android, etc.
              });
            } else {
              console.log('No se pudo obtener el token de registro.');
            }
          } else {
            console.log("Permiso de notificaciones denegado.");
          }
        } catch (err) {
          console.error('Error al configurar notificaciones:', err);
        }
      }
    };

    setupNotifications();
  }, []);
  // -------------------------------------

  // Carga de Datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        if (!seasonSnap.empty) {
          const activeSeasonData = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
          setActiveSeason(activeSeasonData);

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
    <div className={`bg-black text-white antialiased selection:bg-white selection:text-black ${fontApple.className}`}>
      
      {/* NAVBAR FIJO (Sticky) */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center text-white border-b border-white/5 bg-black/40 backdrop-blur-md transition-all">
         <div className="w-20 hidden md:block"></div>
         <div className={`${fontLogo.className} text-lg md:text-xl font-bold tracking-[0.15em] uppercase text-center drop-shadow-md`}>
            LIGA PREMIER
         </div>
         <div className="w-20 flex justify-end">
            <Link href="/matches" className="hidden md:block text-[11px] font-semibold uppercase tracking-widest hover:text-gray-300 transition-colors">
              Calendario
            </Link>
            <Link href="/matches" className="md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </Link>
         </div>
      </nav>

      {/* --- PANTALLA 1: PORTADA EDITORIAL --- */}
      <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {PORTADA_IMAGES.map((src, index) => (
            <img 
              key={index}
              src={src} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-60 scale-105' : 'opacity-0 scale-100'
              }`}
              alt="Portada" 
              style={{ filter: 'brightness(0.6)' }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-5xl mt-16">
          <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-2xl mb-6 animate-in fade-in zoom-in duration-1000">
            {activeSeason?.name || 'TEMPORADA 2026'}
          </h1>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
             <p className="text-xl md:text-3xl font-medium text-gray-200 mb-2 tracking-tight">
               Potencia. Precisión. Rendimiento.
             </p>
             <p className="text-sm md:text-base font-light text-gray-400 tracking-wide">
               Desliza para ver el dominio en el campo.
             </p>
          </div>
        </div>

        <div className="absolute bottom-10 z-20 flex flex-col items-center gap-2 animate-bounce opacity-50">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
           </svg>
        </div>
      </section>

      {/* --- SECCIÓN: AGENDA SEMANAL --- */}
      <section className="relative py-24 w-full bg-[#050507] border-t border-white/10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-2 block">Calendario</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Encuentros de la Semana</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextMatches.length > 0 ? (
              nextMatches.map((m) => (
                <Link href={`/matches/${m.id}`} key={m.id} className="group block">
                  <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/20 transition-all duration-300 hover:bg-white/[0.06] backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6 opacity-50 text-[10px] font-bold uppercase tracking-widest">
                       <span>{new Date(m.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}</span>
                       <span>{m.field}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4 w-1/3">
                          <img src={teams[m.localTeamId]?.shieldUrl || teams[m.localTeamId]?.logoUrl} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" alt="" />
                          <span className="text-[11px] font-bold uppercase tracking-wider truncate">{teams[m.localTeamId]?.name}</span>
                       </div>
                       <div className="text-sm font-semibold text-white/60 group-hover:text-white transition-colors bg-white/10 px-3 py-1 rounded-full">
                          {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                       <div className="flex items-center gap-4 w-1/3 flex-row-reverse text-right">
                          <img src={teams[m.awayTeamId]?.shieldUrl || teams[m.awayTeamId]?.logoUrl} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" alt="" />
                          <span className="text-[11px] font-bold uppercase tracking-wider truncate">{teams[m.awayTeamId]?.name}</span>
                       </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Sin partidos programados
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/matches" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors">
              Ver calendario completo <span className="text-lg">›</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN: TABLA --- */}
      <section className="relative h-[80vh] w-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img src={TABLA_BG} className="w-full h-full object-cover opacity-20 grayscale scale-110" alt="" />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tighter">Clasificación</h2>
          <p className="text-lg font-light text-gray-300 mb-10 tracking-wide max-w-lg mx-auto leading-relaxed">
            La ruta hacia el campeonato, definida por puntos y precisión.
          </p>
          <Link href="/standings" className="inline-block border border-white/30 px-10 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black hover:border-white transition-all duration-300 backdrop-blur-sm">
            Ver Tabla
          </Link>
        </div>
      </section>

      {/* --- SECCIÓN: ESTADÍSTICAS --- */}
      <section className="relative h-[80vh] w-full flex items-center justify-center bg-black overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 z-0">
           <img src={STATS_BG} className="w-full h-full object-cover opacity-20 grayscale scale-110" alt="" />
           <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tighter">Estadísticas</h2>
          <p className="text-lg font-light text-gray-300 mb-10 tracking-wide max-w-lg mx-auto leading-relaxed">
            Análisis profundo. Rendimiento absoluto.
          </p>
          <Link href="/stats" className="inline-block bg-white text-black px-10 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-200 hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10">
            Ver Datos
          </Link>
        </div>
      </section>

    </div>
  );
} 