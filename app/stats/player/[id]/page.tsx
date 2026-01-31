'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  doc, getDoc, collection, getDocs, query, where, 
  collectionGroup 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [player, setPlayer] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const [stats, setStats] = useState({ goals: 0, matches: 0 });
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
        // Carga inicial de torneos y equipos (muy ligera)
        try {
            const [tourSnap, teamsSnap] = await Promise.all([
                getDocs(collection(db, 'tournaments')),
                getDocs(collection(db, 'teams'))
            ]);

            const toursList = tourSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTournaments(toursList);
            
            // Auto-seleccionar el primer torneo si no hay uno
            if (toursList.length > 0 && !selectedTournamentId) {
                setSelectedTournamentId(toursList[0].id);
            }
        } catch (e) { console.error(e); }
    };
    initData();
  }, []);

  // Efecto Principal: Se dispara cuando cambia el ID o el Torneo
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!id || !selectedTournamentId) return; // Esperamos a tener torneo seleccionado
      
      try {
        setLoading(true);

        // --- ESTRATEGIA DE 3 PETICIONES SIMULTÁNEAS (PARALELO) ---
        // El celular descarga todo a la vez, aprovechando el ancho de banda
        
        const [playerSnap, matchesSnap, eventsSnap, teamsSnap] = await Promise.all([
            // 1. Datos del Jugador
            getDoc(doc(db, 'teamPlayers', id)),
            
            // 2. Todos los partidos DEL TORNEO (Ya jugados)
            getDocs(query(
                collection(db, 'matches'),
                where('tournamentId', '==', selectedTournamentId),
                where('status', '==', 'played')
            )),

            // 3. Todos los eventos DEL JUGADOR (Usando el índice que creaste)
            getDocs(query(
                collectionGroup(db, 'events'),
                where('playerId', '==', id)
            )),

            // 4. Equipos (si no se cargaron antes, o para asegurar tener el mapa)
            getDocs(collection(db, 'teams'))
        ]);

        // --- PROCESAMIENTO EN MEMORIA (INSTANTÁNEO) ---

        // A. Mapa de Equipos
        const teamsMap: any = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data(); });

        // B. Datos Básicos Jugador
        let playerData: any = playerSnap.exists() 
            ? { id: playerSnap.id, ...playerSnap.data() }
            : { id, name: 'Jugador', number: '?', photoUrl: null };

        // C. Mapa de Partidos del Torneo (Para acceso rápido)
        const tournamentMatchesMap = new Map();
        matchesSnap.forEach(doc => {
            tournamentMatchesMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        // D. Procesar Eventos y Cruzar con Partidos
        const history: any[] = [];
        const processedMatchIds = new Set(); // Para no contar doble partido si metió 2 goles
        let totalGoals = 0;
        let matchesPlayed = 0;
        let discoveredTeamId = playerData.teamId;

        eventsSnap.forEach((eventDoc) => {
            // Truco: Obtenemos el ID del partido desde la referencia del evento
            // events -> {eventId} -> parent -> matches -> {matchId}
            const matchRef = eventDoc.ref.parent.parent;
            if (!matchRef) return;
            const matchId = matchRef.id;

            // SOLO procesamos si el partido pertenece al torneo seleccionado
            if (tournamentMatchesMap.has(matchId)) {
                const matchData = tournamentMatchesMap.get(matchId);
                const eventData = eventDoc.data();

                // Actualizar info del jugador si la encontramos en el evento
                if (eventData.playerName && playerData.name === 'Jugador') playerData.name = eventData.playerName;
                if (eventData.teamId && !discoveredTeamId) discoveredTeamId = eventData.teamId;

                // Contar goles
                if (eventData.type === 'goal') {
                    totalGoals++;
                }

                // Si es la primera vez que vemos este partido en el bucle, lo agregamos al historial
                // (Pero necesitamos sumar los goles de este partido específico, así que usamos un mapa temporal)
            }
        });

        // RE-PROCESAMIENTO PARA AGRUPAR GOLES POR PARTIDO
        // Como el bucle anterior va evento por evento, ahora agrupamos por partido
        const matchesStats = new Map();

        eventsSnap.forEach((eventDoc) => {
            const matchId = eventDoc.ref.parent?.parent?.id;
            if (matchId && tournamentMatchesMap.has(matchId)) {
                const eventData = eventDoc.data();
                
                if (!matchesStats.has(matchId)) {
                    matchesStats.set(matchId, { goals: 0, matchData: tournamentMatchesMap.get(matchId) });
                }
                
                if (eventData.type === 'goal') {
                    matchesStats.get(matchId).goals += 1;
                }
            }
        });

        // Generar Array Final
        matchesStats.forEach((value, key) => {
            const m = value.matchData;
            const currentTeamId = discoveredTeamId || playerData.teamId;
            const rivalId = (m.localTeamId === currentTeamId) ? m.awayTeamId : m.localTeamId;
            const rivalName = teamsMap[rivalId]?.name || 'Rival';

            matchesPlayed++;
            history.push({
                matchId: m.id,
                date: m.date,
                rivalName: rivalName,
                goals: value.goals,
                result: `${m.localGoals}-${m.awayGoals}`
            });
        });

        // E. Guardar Estados
        if (discoveredTeamId && !playerData.teamId) playerData.teamId = discoveredTeamId;
        
        setPlayer(playerData);
        setStats({ goals: totalGoals, matches: matchesPlayed });
        setMatchHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        if (playerData.teamId && teamsMap[playerData.teamId]) {
            setTeam(teamsMap[playerData.teamId]);
        }

      } catch (error) { 
        console.error("Error cargando perfil:", error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchPlayerData();
  }, [id, selectedTournamentId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="font-sans text-xs text-white/40 uppercase tracking-widest animate-pulse">Cargando perfil...</div>
    </div>
  );

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
        
        {/* SELECTOR DE TORNEO */}
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