'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [player, setPlayer] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  
  // NUEVO: Estados para filtrar por torneo
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const [stats, setStats] = useState({ goals: 0, matches: 0 });
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // 1. CARGAR TORNEOS (Para el filtro)
        const tournamentsSnap = await getDocs(collection(db, 'tournaments'));
        const tournamentsList = tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTournaments(tournamentsList);
        
        // Si no hay torneo seleccionado y existen torneos, seleccionar el primero por defecto
        let currentTournamentId = selectedTournamentId;
        if (tournamentsList.length > 0 && !currentTournamentId) {
            currentTournamentId = tournamentsList[0].id;
            setSelectedTournamentId(currentTournamentId);
        }

        // 2. CARGAR TODOS LOS EQUIPOS
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsMap: any = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });

        // 3. CARGAR DATOS DEL JUGADOR
        let playerData: any = null;
        const playerSnap = await getDoc(doc(db, 'teamPlayers', id));
        if (playerSnap.exists()) {
          playerData = { id: playerSnap.id, ...playerSnap.data() };
        } else {
          playerData = { id, name: 'Jugador', number: '?', photoUrl: null }; 
        }

        // 4. CALCULAR ESTADÍSTICAS (FILTRADAS POR TORNEO)
        let matchesQuery;
        if (currentTournamentId) {
            matchesQuery = query(
                collection(db, 'matches'), 
                where('status', '==', 'played'), 
                where('tournamentId', '==', currentTournamentId)
            );
        } else {
            matchesQuery = query(collection(db, 'matches'), where('status', '==', 'played'));
        }

        const matchesSnap = await getDocs(matchesQuery);
        
        let totalGoals = 0;
        let matchesPlayed = 0;
        const history: any[] = [];
        let discoveredTeamId = playerData.teamId;

        for (const matchDoc of matchesSnap.docs) {
          const match = matchDoc.data();
          const eventsSnap = await getDocs(collection(db, `matches/${matchDoc.id}/events`));
          
          let playedInMatch = false;
          let goalsInMatch = 0;

          eventsSnap.forEach(eventDoc => {
            const event = eventDoc.data();
            if (event.playerId === id) {
              playedInMatch = true;
              if (!discoveredTeamId) discoveredTeamId = event.teamId;
              if (playerData.name === 'Jugador' && event.playerName) playerData.name = event.playerName;

              if (event.type === 'goal') {
                totalGoals++;
                goalsInMatch++;
              }
            }
          });

          if (playedInMatch) {
            matchesPlayed++;
            const currentTeamId = discoveredTeamId || playerData.teamId;
            const rivalId = (match.localTeamId === currentTeamId) ? match.awayTeamId : match.localTeamId;
            const rivalName = teamsMap[rivalId]?.name || 'Rival';

            if (goalsInMatch > 0) {
              history.push({
                matchId: matchDoc.id,
                date: match.date,
                rivalName: rivalName,
                goals: goalsInMatch,
                result: `${match.localGoals}-${match.awayGoals}`
              });
            }
          }
        }

        if (discoveredTeamId && !playerData.teamId) playerData.teamId = discoveredTeamId;

        setPlayer(playerData);
        setStats({ goals: totalGoals, matches: matchesPlayed });
        setMatchHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        if (playerData.teamId && teamsMap[playerData.teamId]) {
          setTeam(teamsMap[playerData.teamId]);
        }

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchPlayerData();
  }, [id, selectedTournamentId]); // Se recarga cuando cambia el ID o el Torneo seleccionado

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-sans text-xs text-white/20 uppercase tracking-widest animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-20 selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <button onClick={() => router.back()} className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-all flex items-center gap-2">
          ← Regresar
        </button>
      </nav>

      <header className="relative pt-32 pb-10 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] z-0 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 p-1 mb-6 shadow-2xl">
            <div className="w-full h-full rounded-full bg-black overflow-hidden relative border-4 border-black">
               {player?.photoUrl ? (
                 <img src={player.photoUrl} className="w-full h-full object-cover" alt={player.name} />
               ) : (
                 <img src={`https://ui-avatars.com/api/?name=${player?.name || 'P'}&background=000&color=fff&font-size=0.33`} className="w-full h-full object-cover opacity-80" alt="Avatar" />
               )}
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-2 leading-none">
            {player?.name || player?.fullName}
          </h1>
          
          {team && (
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 pr-4 pl-1 py-1 rounded-full mt-2 backdrop-blur-md">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                <img src={team.shieldUrl || team.logoUrl} className="w-full h-full object-contain" alt={team.name} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                {team.name}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-6">
        
        {/* SELECTOR DE TORNEO (AQUÍ ESTÁ LA MAGIA) */}
        {tournaments.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2">
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
        )}

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-neutral-900/50 border border-white/10 p-6 rounded-[24px] flex justify-between items-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Goles</p>
              <p className="text-7xl font-black italic tracking-tighter text-white">{stats.goals}</p>
            </div>
            <div className="h-16 w-16 rounded-full border border-blue-500/30 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(59,130,246,0.2)]">⚽</div>
          </div>
          <div className="col-span-2 bg-neutral-900/30 border border-white/5 p-4 rounded-[20px] text-center flex items-center justify-between px-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Juegos</p>
            <p className="text-3xl font-bold tracking-tight text-white">{stats.matches}</p>
          </div>
        </div>

        {/* HISTORIAL */}
        <div className="pt-4">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-4 pl-2">Anotaciones</h3>
          <div className="space-y-3">
            {matchHistory.length > 0 ? (
              matchHistory.map((historyItem, i) => (
                <div key={i} className="flex items-center p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                  <div className="flex flex-col items-center mr-4 w-12 text-center border-r border-white/10 pr-4">
                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
                      {new Date(historyItem.date).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-xl font-bold text-white leading-none mt-1">
                      {new Date(historyItem.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contra</span>
                      <span className="text-sm font-black text-white tracking-wide uppercase truncate">
                         {historyItem.rivalName}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <div className="inline-flex items-center gap-1 bg-blue-600 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        +{historyItem.goals} {historyItem.goals > 1 ? 'Goles' : 'Gol'}
                     </div>
                     <span className="text-[8px] font-medium text-gray-600 mt-1 tracking-wider">
                        {historyItem.result}
                     </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Sin goles en este torneo</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}