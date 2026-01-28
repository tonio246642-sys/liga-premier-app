'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function StandingsPage() {
  const [standings, setStandings] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // PASO 1: BUSCAR LA TEMPORADA ACTIVA (EL FILTRO MAESTRO)
        const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
        const seasonSnap = await getDocs(seasonQ);
        
        if (seasonSnap.empty) {
            setLoading(false);
            return; // No hay temporada activa, no cargamos nada
        }
        
        const activeSeasonId = seasonSnap.docs[0].id;

        // PASO 2: CARGAR SOLO TORNEOS DE ESA TEMPORADA
        const tournamentsQ = query(
            collection(db, 'tournaments'), 
            where('seasonId', '==', activeSeasonId) // <--- ESTA ES LA CLAVE
        );
        const tournamentsSnap = await getDocs(tournamentsQ);
        const tournamentsList = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setTournaments(tournamentsList);
        
        // Seleccionar el primero por defecto si no hay uno seleccionado
        // (O si el seleccionado ya no existe en la nueva lista)
        if (tournamentsList.length > 0) {
            const currentIsValid = tournamentsList.find(t => t.id === selectedTournamentId);
            if (!selectedTournamentId || !currentIsValid) {
                setSelectedTournamentId(tournamentsList[0].id);
            }
        }

        // PASO 3: Cargar Equipos (Mapa para nombres y logos)
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsData: any = {};
        teamsSnap.forEach(doc => {
          teamsData[doc.id] = {
            id: doc.id,
            name: doc.data().name,
            shieldUrl: doc.data().shieldUrl || doc.data().logoUrl,
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0
          };
        });

        // PASO 4: Cargar Partidos (FILTRADOS POR EL TORNEO SELECCIONADO)
        let matchesQuery;
        
        // Usamos el ID que acabamos de decidir (selectedTournamentId o el primero de la lista)
        const targetTournamentId = selectedTournamentId || (tournamentsList.length > 0 ? tournamentsList[0].id : null);

        if (targetTournamentId) {
            matchesQuery = query(
                collection(db, 'matches'), 
                where('status', '==', 'played'),
                where('tournamentId', '==', targetTournamentId) 
            );

            const matchesSnap = await getDocs(matchesQuery);

            matchesSnap.forEach(doc => {
              const m = doc.data();
              const local = teamsData[m.localTeamId];
              const away = teamsData[m.awayTeamId];
              
              if (local && away) {
                local.pj += 1; away.pj += 1;
                local.gf += m.localGoals; local.gc += m.awayGoals;
                away.gf += m.awayGoals; away.gc += m.localGoals;
                
                if (m.localGoals > m.awayGoals) { 
                  local.pg += 1; local.pts += 3; 
                  away.pp += 1;
                } else if (m.localGoals < m.awayGoals) { 
                  away.pg += 1; away.pts += 3; 
                  local.pp += 1;
                } else { 
                  local.pe += 1; local.pts += 1; 
                  away.pe += 1; away.pts += 1; 
                }
                local.dg = local.gf - local.gc;
                away.dg = away.gf - away.gc;
              }
            });
        }

        // Ordenar tabla
        const sorted = Object.values(teamsData)
            .filter((t: any) => t.pj > 0) 
            .sort((a: any, b: any) => b.pts - a.pts || b.dg - a.dg);
            
        setStandings(sorted);

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    fetchData();
  }, [selectedTournamentId]); // Se re-ejecuta si cambias de torneo manualmente

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-20">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <Link href="/" className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors">
          ← Inicio
        </Link>
      </nav>

      {/* HEADER CON SELECTOR DE TORNEO */}
      <header className="px-6 pt-24 pb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tighter mb-6">Tabla General.</h1>
        
        {/* SELECTOR DE TORNEOS (Solo de la temporada activa) */}
        {tournaments.length > 0 ? (
            tournaments.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
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
            <div className="mb-4 text-xs text-gray-500 uppercase tracking-widest">No hay torneos activos</div>
        )}
        
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {tournaments.find(t => t.id === selectedTournamentId)?.name || 'Clasificación'}
        </p>
      </header>

      <main className="px-2 max-w-4xl mx-auto">
        
        {/* ENCABEZADOS */}
        <div className="flex px-4 mb-4 text-[8px] font-black text-gray-600 uppercase tracking-widest border-b border-white/5 pb-2">
          <div className="w-6 text-center">#</div>
          <div className="flex-1 ml-4">Equipo</div>
          <div className="w-7 text-center">PJ</div>
          <div className="w-7 text-center">PG</div>
          <div className="w-7 text-center">PE</div>
          <div className="w-7 text-center">PP</div>
          <div className="w-8 text-center">GF</div>
          <div className="w-8 text-center">GC</div>
          <div className="w-8 text-center text-blue-400">DG</div>
          <div className="w-10 text-right text-white">Pts</div>
        </div>

        {/* LISTA DE EQUIPOS */}
        {loading ? (
            <div className="py-20 text-center font-sans uppercase tracking-[0.3em] text-xs text-white/20 animate-pulse">Cargando Datos...</div>
        ) : (
            <div className="space-y-1">
            {standings.map((team, index) => (
                <Link href={`/teams/${team.id}`} key={team.id} className="block group active:scale-[0.99] transition-all">
                <div className="flex items-center p-3 rounded-xl bg-neutral-900/30 border border-white/5 hover:bg-white/[0.05] transition-all">
                    <div className="w-6 text-center text-[10px] font-bold text-gray-500">{index + 1}</div>
                    <div className="flex-1 flex items-center gap-3 ml-3 overflow-hidden">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1 shrink-0 shadow-lg">
                        <img src={team.shieldUrl} className="w-full h-full object-contain" alt="" />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight uppercase truncate">{team.name}</span>
                    </div>
                    <div className="flex items-center text-[10px] font-medium text-gray-400">
                    <div className="w-7 text-center">{team.pj}</div>
                    <div className="w-7 text-center">{team.pg}</div>
                    <div className="w-7 text-center">{team.pe}</div>
                    <div className="w-7 text-center">{team.pp}</div>
                    <div className="w-8 text-center">{team.gf}</div>
                    <div className="w-8 text-center">{team.gc}</div>
                    <div className={`w-8 text-center font-bold ${team.dg >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {team.dg > 0 ? `+${team.dg}` : team.dg}
                    </div>
                    <div className="w-10 text-right text-sm font-black text-white italic tracking-tighter">{team.pts}</div>
                    </div>
                </div>
                </Link>
            ))}
            {standings.length === 0 && (
                <div className="py-10 text-center text-gray-600 text-[10px] uppercase tracking-widest">No hay datos registrados en este torneo</div>
            )}
            </div>
        )}
      </main>
    </div>
  );
}