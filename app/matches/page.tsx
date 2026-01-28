'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function CalendarPage() {
  // --- MISMOS ESTADOS Y LÓGICA (NO SE TOCÓ NADA AQUÍ) ---
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  
  const [matchdays, setMatchdays] = useState<any[]>([]);
  const [selectedMatchday, setSelectedMatchday] = useState<string>('');
  
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // 1. CARGA INICIAL
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsMap: any = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
        setTeams(teamsMap);

        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        
        if (!seasonSnap.empty) {
            const activeSeasonId = seasonSnap.docs[0].id;
            const tournamentsQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeasonId));
            const tournamentsSnap = await getDocs(tournamentsQ);
            const tournamentsList = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setTournaments(tournamentsList);

            if (tournamentsList.length > 0) {
                setSelectedTournamentId(tournamentsList[0].id);
            }
        }
      } catch (error) { console.error("Error inicial:", error); }
      finally { setLoading(false); }
    };
    fetchInitData();
  }, []);

  // 2. CARGAR JORNADAS
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!selectedTournamentId) return;
      setLoading(true);

      try {
        const mdaySnap = await getDocs(query(collection(db, 'matchdays'), where('tournamentId', '==', selectedTournamentId)));
        const mdays = mdaySnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => a.number - b.number);
        
        setMatchdays(mdays);

        if (mdays.length > 0) {
            setSelectedMatchday(mdays[0].id);
        } else {
            setSelectedMatchday('');
        }

        const matchSnap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', selectedTournamentId)));
        setMatches(matchSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) { console.error("Error cargando torneo:", error); }
      finally { setLoading(false); }
    };

    fetchTournamentData();
  }, [selectedTournamentId]);

  const currentMatches = matches
    .filter(m => m.matchdayId === selectedMatchday)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- UI RENDER MEJORADO ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500 selection:text-white pb-32 relative overflow-hidden">
      
      {/* Fondo Decorativo Sutil (Glow) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <nav className="relative z-50 px-6 py-6 flex justify-between items-center">
        <Link 
            href="/" 
            className="group flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Inicio
        </Link>
      </nav>

      {/* HEADER */}
      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              Calendario
            </h1>

            {/* SELECTOR DE TORNEOS (TABS MODERNOS) */}
            {tournaments.length > 0 ? (
                tournaments.length > 1 && (
                    <div className="inline-flex p-1 mb-8 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        {tournaments.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTournamentId(t.id)}
                                className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                                    selectedTournamentId === t.id 
                                    ? 'bg-white text-black shadow-lg shadow-white/10' 
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                )
            ) : (
                <div className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-medium">No hay torneos activos</div>
            )}

            {/* SELECTOR DE JORNADAS (SCROLL HORIZONTAL) */}
            {matchdays.length > 0 ? (
                <div className="relative group">
                    {/* Sombras de scroll para indicar contenido */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"/>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"/>

                    <div className="flex overflow-x-auto gap-3 py-2 px-1 scrollbar-hide snap-x items-center">
                        {matchdays.map(m => {
                            const isActive = selectedMatchday === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMatchday(m.id)}
                                    className={`snap-center shrink-0 relative px-6 py-4 rounded-2xl border transition-all duration-300 flex flex-col items-center min-w-[90px] group/item ${
                                        isActive
                                        ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_30px_-10px_rgba(79,70,229,0.5)] scale-105 z-10'
                                        : 'bg-neutral-900/50 border-white/5 hover:border-white/20 hover:bg-neutral-800'
                                    }`}
                                >
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 transition-colors ${isActive ? 'text-indigo-200' : 'text-neutral-500 group-hover/item:text-neutral-400'}`}>
                                        Jor.
                                    </span>
                                    <span className={`text-2xl font-black italic tracking-tighter transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover/item:text-white'}`}>
                                        {m.number}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                !loading && <p className="text-neutral-600 text-xs mt-4">Esperando calendario...</p>
            )}
        </div>
      </header>

      {/* LISTA DE PARTIDOS */}
      <main className="relative z-10 px-4 max-w-2xl mx-auto mt-6">
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                 <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                 <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 animate-pulse">Cargando Encuentros</div>
             </div>
        ) : (
            <div className="space-y-5">
            {currentMatches.length > 0 ? (
                currentMatches.map(match => {
                    const isPlayed = match.status === 'played';
                    return (
                        <Link href={`/matches/${match.id}`} key={match.id} className="block group active:scale-[0.98] transition-all duration-300">
                            <div className="relative p-0 rounded-3xl bg-neutral-900/40 border border-white/5 backdrop-blur-md overflow-hidden hover:border-white/10 hover:bg-neutral-900/60 transition-all shadow-xl shadow-black/20">
                                
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-b-full opacity-50" />

                                {/* Header de la tarjeta (Fecha y Campo) */}
                                <div className="px-6 pt-5 pb-2 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                            {match.field || 'Campo TBD'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-white/5 px-2 py-1 rounded-md">
                                        {new Date(match.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                
                                {/* Cuerpo del partido */}
                                <div className="px-6 py-6 flex justify-between items-center relative z-10">
                                    {/* Local */}
                                    <div className="flex flex-col items-center w-1/3 gap-3">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-3 shadow-lg shadow-black/50 ring-2 ring-white/5 group-hover:scale-110 transition-transform duration-300">
                                            <img 
                                                src={teams[match.localTeamId]?.shieldUrl || teams[match.localTeamId]?.logoUrl} 
                                                className="w-full h-full object-contain drop-shadow-md" 
                                                alt="Local" 
                                            />
                                        </div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider text-center leading-tight">
                                            {teams[match.localTeamId]?.name || "Local"}
                                        </p>
                                    </div>

                                    {/* Score / VS */}
                                    <div className="flex flex-col items-center justify-center w-1/3 relative">
                                        {isPlayed ? (
                                            <div className="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-2xl border border-white/5">
                                                <span className="text-4xl font-black italic tracking-tighter text-white drop-shadow-glow">{match.localGoals}</span>
                                                <div className="h-8 w-[1px] bg-white/20 rotate-12"></div>
                                                <span className="text-4xl font-black italic tracking-tighter text-white drop-shadow-glow">{match.awayGoals}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-3xl font-black text-white/10 italic select-none">VS</span>
                                                <div className="bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                                                    <span className="text-[11px] font-bold tracking-widest">
                                                        {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <span className={`absolute -bottom-6 text-[9px] font-bold uppercase tracking-[0.2em] ${isPlayed ? 'text-green-500' : 'text-neutral-600'}`}>
                                            {isPlayed ? 'Finalizado' : ''}
                                        </span>
                                    </div>

                                    {/* Visita */}
                                    <div className="flex flex-col items-center w-1/3 gap-3">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-3 shadow-lg shadow-black/50 ring-2 ring-white/5 group-hover:scale-110 transition-transform duration-300">
                                            <img 
                                                src={teams[match.awayTeamId]?.shieldUrl || teams[match.awayTeamId]?.logoUrl} 
                                                className="w-full h-full object-contain drop-shadow-md" 
                                                alt="Visita" 
                                            />
                                        </div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider text-center leading-tight">
                                            {teams[match.awayTeamId]?.name || "Visita"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })
            ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[30px] bg-white/[0.01] flex flex-col items-center gap-3">
                    <div className="text-4xl opacity-20">📅</div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                        No hay partidos programados
                    </p>
                </div>
            )}
            </div>
        )}
      </main>
    </div>
  );
}