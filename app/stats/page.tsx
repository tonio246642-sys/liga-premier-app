'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function StatsPage() {
  const [scorers, setScorers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any>({});
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // 1. BUSCAR TEMPORADA ACTIVA
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        
        if (!seasonSnap.empty) {
            const activeSeasonId = seasonSnap.docs[0].id;
            
            // 2. BUSCAR TORNEOS DE ESA TEMPORADA
            const tournamentsQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeasonId));
            const tournamentsSnap = await getDocs(tournamentsQ);
            const tournamentsList = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setTournaments(tournamentsList);
            
            // Seleccionar por defecto
            let currentTournamentId = selectedTournamentId;
            if (tournamentsList.length > 0) {
                // Si el seleccionado no está en la lista (cambió temp), reseteamos al primero
                const exists = tournamentsList.find(t => t.id === currentTournamentId);
                if (!currentTournamentId || !exists) {
                    currentTournamentId = tournamentsList[0].id;
                    setSelectedTournamentId(currentTournamentId);
                }
            }

            // 3. CARGAR EQUIPOS
            const teamsSnap = await getDocs(collection(db, 'teams'));
            const teamsMap: any = {};
            teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });
            setTeams(teamsMap);

            // 4. CARGAR PARTIDOS DEL TORNEO SELECCIONADO
            let matchesQuery;
            if (currentTournamentId) {
                matchesQuery = query(
                    collection(db, 'matches'), 
                    where('status', '==', 'played'),
                    where('tournamentId', '==', currentTournamentId)
                );

                const matchesSnap = await getDocs(matchesQuery);
                const playerGoals: any = {};

                for (const matchDoc of matchesSnap.docs) {
                    const eventsSnap = await getDocs(collection(db, `matches/${matchDoc.id}/events`));
                    eventsSnap.forEach(eventDoc => {
                        const event = eventDoc.data();
                        if (event.type === 'goal') {
                        if (!playerGoals[event.playerId]) {
                            playerGoals[event.playerId] = {
                            id: event.playerId,
                            name: event.playerName,
                            teamId: event.teamId,
                            goals: 0
                            };
                        }
                        playerGoals[event.playerId].goals += 1;
                        }
                    });
                }

                const sortedScorers = Object.values(playerGoals).sort((a: any, b: any) => b.goals - a.goals);
                setScorers(sortedScorers);
            }
        }

      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedTournamentId]); // Se ejecuta al cambiar torneo

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-20">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <Link href="/" className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-all">
          ← Inicio
        </Link>
      </nav>

      {/* HEADER */}
      <header className="px-6 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Power Rankings</p>
          <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-6">Goleadores.</h1>
          
          {/* SELECTOR DE TORNEOS */}
          {tournaments.length > 0 ? (
            tournaments.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {tournaments.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTournamentId(t.id)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedTournamentId === t.id 
                                ? 'bg-white text-black shadow-lg' 
                                : 'bg-neutral-900 border border-white/10 text-gray-500 hover:text-white'
                            }`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            )
          ) : (
            <div className="text-xs text-gray-500 mb-6 uppercase tracking-widest">No hay torneos activos</div>
          )}
        </div>
      </header>

      <main className="px-4 max-w-2xl mx-auto">
        
        {loading ? (
            <div className="py-20 text-center font-sans uppercase tracking-[0.3em] text-xs text-white/20 animate-pulse">Calculando Goles...</div>
        ) : (
            <div className="space-y-4">
            {scorers.map((player, index) => (
                <Link href={`/stats/player/${player.id}`} key={player.id} className="block group active:scale-[0.98] transition-all duration-200">
                <div className="relative flex items-center p-6 rounded-[28px] bg-neutral-900/40 border border-white/5 backdrop-blur-md group-hover:bg-white/[0.08] transition-all">
                    
                    <div className="flex flex-col items-center justify-center mr-6">
                    <span className={`text-2xl font-black italic tracking-tighter ${index === 0 ? 'text-yellow-500' : 'text-white/20'}`}>
                        {index + 1}
                    </span>
                    </div>

                    <div className="flex-1">
                    <h3 className="text-lg font-bold tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                        {player.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                        <img 
                            src={teams[player.teamId]?.shieldUrl || teams[player.teamId]?.logoUrl} 
                            className="w-full h-full object-contain" 
                            alt="" 
                        />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {teams[player.teamId]?.name}
                        </span>
                    </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="text-4xl font-black italic tracking-tighter text-white">
                        {player.goals}
                        </div>
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest -mt-1">Goles</span>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>
                </Link>
            ))}

            {scorers.length === 0 && (
                <div className="py-20 text-center text-white/20 text-xs font-black uppercase tracking-[0.3em]">
                Sin goles en este torneo
                </div>
            )}
            </div>
        )}
      </main>
    </div>
  );
}