'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PublicMatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [match, setMatch] = useState<any>(null);
  const [localTeam, setLocalTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!id) return;
      try {
        const matchRef = doc(db, 'matches', id);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          const matchData = matchSnap.data();
          setMatch(matchData);
          const [lSnap, aSnap] = await Promise.all([
            getDoc(doc(db, 'teams', matchData.localTeamId)),
            getDoc(doc(db, 'teams', matchData.awayTeamId))
          ]);
          if (lSnap.exists()) setLocalTeam(lSnap.data());
          if (aSnap.exists()) setAwayTeam(aSnap.data());
          
          const eventsSnap = await getDocs(collection(db, `matches/${id}/events`));
          const sortedEvents = eventsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => (parseInt(a.minute) || 0) - (parseInt(b.minute) || 0));
          setEvents(sortedEvents);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchPublicData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-sans text-xs text-white/20 uppercase tracking-widest animate-pulse">Cargando Encuentro...</div>;
  if (!match) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Partido no encontrado</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-20 selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR MINIMALISTA */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <button onClick={() => router.back()} className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-all flex items-center gap-2">
          ← Regresar
        </button>
        <div className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40 italic">Match Center</div>
      </nav>

      <main className="px-4 pt-24 max-w-md mx-auto space-y-8">
        
        {/* 1. SCOREBOARD (MARCADOR GIGANTE) */}
        <div className="relative bg-neutral-900/50 border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl">
           {/* Efecto de luz de fondo */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-600/20 rounded-full blur-[60px] pointer-events-none"></div>

           <div className="relative z-10 flex justify-between items-center">
              {/* LOCAL */}
              <div className="flex flex-col items-center w-1/3 gap-3">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shadow-black/50">
                    <img 
                        src={localTeam?.shieldUrl || localTeam?.logoUrl} 
                        className="w-full h-full object-contain" 
                        alt="Local" 
                    />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                    {localTeam?.name}
                 </span>
              </div>

              {/* MARCADOR / VS */}
              <div className="flex flex-col items-center justify-center w-1/3">
                 {match.status === 'played' ? (
                    <div className="flex items-center gap-2">
                        <span className="text-5xl font-black italic tracking-tighter text-white">{match.localGoals}</span>
                        <div className="h-px w-3 bg-white/20"></div>
                        <span className="text-5xl font-black italic tracking-tighter text-white">{match.awayGoals}</span>
                    </div>
                 ) : (
                    <span className="text-4xl font-black italic text-white/10">VS</span>
                 )}
                 
                 <div className="mt-3 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                        {match.status === 'played' ? 'Final' : new Date(match.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                 </div>
              </div>

              {/* VISITA */}
              <div className="flex flex-col items-center w-1/3 gap-3">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shadow-black/50">
                    <img 
                        src={awayTeam?.shieldUrl || awayTeam?.logoUrl} 
                        className="w-full h-full object-contain" 
                        alt="Visita" 
                    />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                    {awayTeam?.name}
                 </span>
              </div>
           </div>
        </div>

        {/* 2. LÍNEA DE TIEMPO (EVENTOS) */}
        <div>
           <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-4 pl-2">
             Crónica del Juego
           </h3>
           
           <div className="bg-neutral-900/30 border border-white/5 rounded-[24px] overflow-hidden">
             {events.length > 0 ? events.map((event, index) => (
               <div key={index} className={`flex items-center p-4 gap-4 ${index !== events.length - 1 ? 'border-b border-white/5' : ''}`}>
                  
                  {/* Minuto */}
                  <div className="flex flex-col items-center w-10">
                     <span className="text-xs font-black text-blue-500">{event.minute}'</span>
                  </div>
                  
                  {/* Indicador de equipo (Barra lateral) */}
                  <div className={`w-1 h-8 rounded-full ${event.teamId === match.localTeamId ? 'bg-white' : 'bg-gray-600'}`}></div>

                  {/* Detalle del Evento */}
                  <div className="flex-1">
                    <Link href={`/stats/player/${event.playerId}`} className="block group">
                       <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight block">
                          {event.playerName}
                       </span>
                    </Link>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                       {event.type === 'goal' ? 'Gol Anotado' : (event.type.includes('yellow') ? 'Tarjeta Amarilla' : 'Tarjeta Roja')}
                    </span>
                  </div>

                  {/* Icono */}
                  <div className="text-xl">
                    {event.type === 'goal' ? '⚽' : (event.type.includes('yellow') ? '🟨' : '🟥')}
                  </div>
               </div>
             )) : (
               <div className="p-10 text-center">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Sin incidencias registradas
                 </p>
               </div>
             )}
           </div>
        </div>

      </main>
    </div>
  );
}