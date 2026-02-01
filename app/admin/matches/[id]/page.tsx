'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  doc, getDoc, updateDoc, serverTimestamp, 
  collection, addDoc, getDocs, query, where 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function MatchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [match, setMatch] = useState<any>(null);
  const [localTeam, setLocalTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [localPlayers, setLocalPlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  
  const [localGoals, setLocalGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<{teamId: string, type: string} | null>(null);

  useEffect(() => {
    const fetchFullData = async () => {
      if (!id) return;
      try {
        const matchRef = doc(db, 'matches', id);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          const matchData = matchSnap.data();
          setMatch(matchData);
          setLocalGoals(matchData.localGoals || 0);
          setAwayGoals(matchData.awayGoals || 0);

          const [lSnap, aSnap] = await Promise.all([
            getDoc(doc(db, 'teams', matchData.localTeamId)),
            getDoc(doc(db, 'teams', matchData.awayTeamId))
          ]);
          
          if (lSnap.exists()) setLocalTeam({ id: lSnap.id, ...lSnap.data() });
          if (aSnap.exists()) setAwayTeam({ id: aSnap.id, ...aSnap.data() });

          // Cargar jugadores (aunque esté vacío no dará error)
          const [lPlayersSnap, aPlayersSnap] = await Promise.all([
            getDocs(query(collection(db, 'teamPlayers'), where('teamId', '==', matchData.localTeamId))),
            getDocs(query(collection(db, 'teamPlayers'), where('teamId', '==', matchData.awayTeamId)))
          ]);

          setLocalPlayers(lPlayersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setAwayPlayers(aPlayersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error("Error:", e); }
      setLoading(false);
    };
    fetchFullData();
  }, [id]);

  const openEventModal = (teamId: string, type: 'goal' | 'yellow' | 'red') => {
    setCurrentAction({ teamId, type });
    setShowModal(true);
  };

  const confirmEvent = (player: any) => {
    if (!currentAction) return;
    const minute = prompt("¿Minuto del suceso?");
    
    const newEvent = {
      type: currentAction.type,
      teamId: currentAction.teamId,
      // Si es genérico, guardamos IDs especiales
      playerId: player.id || 'unknown',
      playerName: player.fullName || (currentAction.type === 'goal' ? 'Gol Genérico' : 'Tarjeta'), 
      minute: minute || "--",
      createdAt: new Date().toISOString()
    };

    setEvents([...events, newEvent]);
    if (currentAction.type === 'goal') {
      if (currentAction.teamId === match.localTeamId) setLocalGoals(prev => prev + 1);
      else setAwayGoals(prev => prev + 1);
    }
    setShowModal(false);
  };

  const saveResult = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'matches', id);
      await updateDoc(docRef, {
        localGoals,
        awayGoals,
        status: 'played',
        updatedAt: serverTimestamp()
      });

      for (const event of events) {
        await addDoc(collection(db, `matches/${id}/events`), event);
      }
      alert("Partido finalizado con éxito.");
      router.push('/admin/matches');
    } catch (e) { alert("Error al guardar"); }
    setSaving(false);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">CARGANDO DATOS...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-[40px] shadow-2xl border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center p-12 gap-8 bg-white border-b">
          <div className="flex flex-col items-center">
            <img src={localTeam?.shieldUrl || localTeam?.logoUrl} className="w-24 h-24 object-contain mb-2" alt="" />
            <h2 className="text-xl font-black uppercase text-center">{localTeam?.name}</h2>
            <span className="text-7xl font-black text-indigo-600">{localGoals}</span>
            <div className="flex gap-3 mt-6">
              <button onClick={() => openEventModal(match.localTeamId, 'goal')} className="bg-green-500 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">⚽</button>
              <button onClick={() => openEventModal(match.localTeamId, 'yellow')} className="bg-yellow-400 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">🟨</button>
              <button onClick={() => openEventModal(match.localTeamId, 'red')} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">🟥</button>
            </div>
          </div>
          <div className="text-center text-5xl font-black text-gray-100 italic">VS</div>
          <div className="flex flex-col items-center">
            <img src={awayTeam?.shieldUrl || awayTeam?.logoUrl} className="w-24 h-24 object-contain mb-2" alt="" />
            <h2 className="text-xl font-black uppercase text-center">{awayTeam?.name}</h2>
            <span className="text-7xl font-black text-indigo-600">{awayGoals}</span>
            <div className="flex gap-3 mt-6">
              <button onClick={() => openEventModal(match.awayTeamId, 'goal')} className="bg-green-500 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">⚽</button>
              <button onClick={() => openEventModal(match.awayTeamId, 'yellow')} className="bg-yellow-400 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">🟨</button>
              <button onClick={() => openEventModal(match.awayTeamId, 'red')} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">🟥</button>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[35px] overflow-hidden shadow-2xl">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h3 className="font-black uppercase">¿Quién anotó?</h3>
                <button onClick={() => setShowModal(false)} className="text-2xl font-bold">✕</button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto bg-gray-50">
                
                {/* --- BOTÓN PARA REGISTRAR SIN JUGADOR --- */}
                <button 
                    onClick={() => confirmEvent({ id: 'unknown', fullName: 'Jugador No Registrado', photoUrl: null })} 
                    className="w-full mb-4 bg-white border-2 border-dashed border-indigo-300 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-50 transition shadow-sm group"
                >
                    <span className="bg-indigo-100 p-2 rounded-full text-xl group-hover:scale-110 transition">⚡</span>
                    <span className="font-black text-indigo-600 uppercase">Registrar sin nombre</span>
                </button>
                
                <p className="text-xs font-bold text-gray-400 uppercase mb-2 pl-2 tracking-widest">Jugadores del Plantel</p>
                
                {(currentAction?.teamId === match.localTeamId ? localPlayers : awayPlayers).length === 0 && (
                    <p className="text-center text-sm text-gray-400 italic py-4">No hay jugadores registrados aún.</p>
                )}

                {(currentAction?.teamId === match.localTeamId ? localPlayers : awayPlayers).map(p => (
                  <button key={p.id} onClick={() => confirmEvent(p)} className="w-full flex items-center gap-4 p-3 bg-white mb-2 rounded-xl shadow-sm hover:shadow-md transition border">
                    {p.photoUrl ? (
                        <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">?</div>
                    )}
                    <span className="font-bold uppercase text-sm text-gray-700">{p.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="p-8 bg-slate-50">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-6 tracking-widest italic">Eventos Registrados</h3>
          <div className="space-y-3">
            {events.length === 0 ? (
                <p className="text-center text-gray-400 italic text-sm">Aún no hay eventos.</p>
            ) : (
                events.map((e, i) => (
                <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xl">{e.type === 'goal' ? '⚽' : e.type === 'yellow' ? '🟨' : '🟥'}</span>
                    <div className="flex-1">
                    <p className="font-black text-sm text-slate-800 uppercase">{e.playerName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                        {e.teamId === match.localTeamId ? localTeam?.name : awayTeam?.name}
                    </p>
                    </div>
                    <span className="font-black italic text-indigo-600">{e.minute}'</span>
                </div>
                ))
            )}
          </div>
        </div>

        <div className="p-10 flex flex-col items-center border-t">
          <button onClick={saveResult} disabled={saving} className="bg-gray-900 text-white px-20 py-5 rounded-[25px] font-black text-xl md:text-2xl hover:bg-blue-600 transition shadow-xl disabled:opacity-50">
            {saving ? 'GUARDANDO...' : 'FINALIZAR PARTIDO'}
          </button>
        </div>
      </div>
    </div>
  );
}