'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function CalendarPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  
  const [matchdays, setMatchdays] = useState<any[]>([]);
  const [selectedMatchday, setSelectedMatchday] = useState<string>('');
  
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // 1. CARGA INICIAL: TEMPORADA ACTIVA -> TORNEOS
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        // Cargar Equipos
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsMap: any = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
        setTeams(teamsMap);

        // BUSCAR TEMPORADA ACTIVA
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        
        if (!seasonSnap.empty) {
            const activeSeasonId = seasonSnap.docs[0].id;
            
            // CARGAR TORNEOS DE ESTA TEMPORADA
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

  // 2. CARGAR JORNADAS Y PARTIDOS CUANDO CAMBIA EL TORNEO
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!selectedTournamentId) return;
      setLoading(true);

      try {
        // Cargar Jornadas del Torneo
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

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-24 selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <Link href="/" className="pointer-events-auto text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors">
          ← Inicio
        </Link>
      </nav>

      {/* HEADER */}
      <header className="px-6 pt-24 pb-4">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-5xl font-semibold tracking-tighter mb-6">Calendario.</h1>

            {/* SELECTOR DE TORNEOS */}
            {tournaments.length > 0 ? (
                tournaments.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {tournaments.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTournamentId(t.id)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    selectedTournamentId === t.id 
                                    ? 'bg-white text-black shadow-lg scale-105' 
                                    : 'bg-neutral-900 border border-white/10 text-gray-500 hover:text-white'
                                }`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                )
            ) : (
                <div className="text-xs text-gray-500 mb-4 uppercase tracking-widest">No hay torneos activos</div>
            )}

            {/* BARRA DE JORNADAS */}
            {matchdays.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x">
                    {matchdays.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedMatchday(m.id)}
                            className={`snap-center shrink-0 px-5 py-3 rounded-2xl border transition-all duration-300 flex flex-col items-center min-w-[80px] ${
                                selectedMatchday === m.id
                                ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40'
                                : 'bg-neutral-900/40 border-white/5 hover:bg-white/5'
                            }`}
                        >
                            <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${selectedMatchday === m.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                Jornada
                            </span>
                            <span className={`text-xl font-black italic tracking-tighter ${selectedMatchday === m.id ? 'text-white' : 'text-gray-400'}`}>
                                {m.number}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                !loading && <p className="text-gray-500 text-xs">No hay jornadas creadas.</p>
            )}
        </div>
      </header>

      {/* LISTA DE PARTIDOS */}
      <main className="px-4 max-w-2xl mx-auto mt-4">
        {loading ? (
             <div className="py-20 text-center font-sans uppercase tracking-[0.3em] text-xs text-white/20 animate-pulse">Cargando Encuentros...</div>
        ) : (
            <div className="space-y-4">
            {currentMatches.length > 0 ? (
                currentMatches.map(match => (
                <Link href={`/matches/${match.id}`} key={match.id} className="block group active:scale-[0.98] transition-all duration-200">
                    <div className="relative p-6 rounded-[30px] bg-neutral-900/40 border border-white/5 backdrop-blur-md group-hover:bg-white/[0.05] transition-all overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-6 opacity-60">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {match.field || 'Campo TBD'}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                                {new Date(match.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex flex-col items-center w-1/3 gap-3">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shadow-black/50">
                                    <img src={teams[match.localTeamId]?.shieldUrl || teams[match.localTeamId]?.logoUrl} className="w-full h-full object-contain" alt="Local" />
                                </div>
                                <p className="text-[10px] font-black text-white uppercase tracking-widest text-center truncate w-full">
                                    {teams[match.localTeamId]?.name || "Local"}
                                </p>
                            </div>
                            <div className="flex flex-col items-center justify-center w-1/3">
                                {match.status === 'played' ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl font-black italic tracking-tighter text-white">{match.localGoals}</span>
                                        <div className="h-px w-4 bg-white/20"></div>
                                        <span className="text-4xl font-black italic tracking-tighter text-white">{match.awayGoals}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-black text-white/10 italic">VS</span>
                                        <div className="mt-2 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                                            <span className="text-[10px] font-bold text-white tracking-widest">
                                                {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-2">
                                    {match.status === 'played' ? 'Finalizado' : 'Por jugar'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center w-1/3 gap-3">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shadow-black/50">
                                    <img src={teams[match.awayTeamId]?.shieldUrl || teams[match.awayTeamId]?.logoUrl} className="w-full h-full object-contain" alt="Visita" />
                                </div>
                                <p className="text-[10px] font-black text-white uppercase tracking-widest text-center truncate w-full">
                                    {teams[match.awayTeamId]?.name || "Visita"}
                                </p>
                            </div>
                        </div>
                    </div>
                </Link>
                ))
            ) : (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
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