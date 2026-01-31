'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, where, 
  serverTimestamp, orderBy 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function MatchesPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [matchdays, setMatchdays] = useState<any[]>([]);
  const [selectedMatchdayId, setSelectedMatchdayId] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  
  // Estado del Formulario
  const [localTeamId, setLocalTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [field, setField] = useState('');
  const [groupId, setGroupId] = useState('General'); 
  const [loading, setLoading] = useState(false);

  // 1. Cargar Torneos
  useEffect(() => {
    const fetchTournaments = async () => {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTournaments();
  }, []);

  // 2. Cargar Jornadas y Equipos
  useEffect(() => {
    if (selectedTourId) {
      const fetchContext = async () => {
        // Cargar Jornadas
        const mq = query(collection(db, 'matchdays'), where('tournamentId', '==', selectedTourId));
        const mSnap = await getDocs(mq);
        const sortedMatchdays = mSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a:any, b:any) => a.number - b.number);
        setMatchdays(sortedMatchdays);

        // Cargar Equipos (Filtrados y Ordenados Alfabéticamente)
        const tour = tournaments.find(t => t.id === selectedTourId);
        const tSnap = await getDocs(collection(db, 'teams'));
        const allTeams = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filtramos solo los del torneo y ordenamos A-Z
        const tourTeams = allTeams
            .filter(t => tour.teamIds.includes(t.id))
            .sort((a:any, b:any) => a.name.localeCompare(b.name));
            
        setTeams(tourTeams);
        
        if (tour.type === 'round_robin') setGroupId('General');
      };
      fetchContext();
    }
  }, [selectedTourId, tournaments]);

  // 3. Cargar partidos
  useEffect(() => {
    if (selectedMatchdayId) {
      fetchMatches();
    } else {
      setMatches([]);
    }
  }, [selectedMatchdayId]);

  const fetchMatches = async () => {
    const q = query(collection(db, 'matches'), where('matchdayId', '==', selectedMatchdayId));
    const snap = await getDocs(q);
    setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // --- FUNCIÓN EDITADA PARA NOTIFICACIONES ---
  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localTeamId === awayTeamId) return alert("Error: El equipo local y visitante no pueden ser el mismo.");
    setLoading(true);

    try {
      // 1. Guardar en Base de Datos
      await addDoc(collection(db, 'matches'), {
        tournamentId: selectedTourId,
        matchdayId: selectedMatchdayId,
        localTeamId,
        awayTeamId,
        date: matchDate,
        field,
        groupId, 
        status: 'scheduled',
        localGoals: 0,
        awayGoals: 0,
        createdAt: serverTimestamp()
      });

      // 2. Enviar Notificación Push (NUEVO)
      // Buscamos los nombres para el mensaje
      const localName = teams.find(t => t.id === localTeamId)?.name || 'Local';
      const awayName = teams.find(t => t.id === awayTeamId)?.name || 'Visitante';
      
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📅 Nuevo Partido Programado',
          message: `${localName} vs ${awayName} - ${new Date(matchDate).toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute:'2-digit'})}`,
        })
      });

      alert("Partido programado y notificación enviada.");
      
      // Limpiar formulario
      setLocalTeamId(''); 
      setAwayTeamId('');
      fetchMatches();

    } catch (error) { 
        console.error(error); 
        alert("El partido se creó, pero hubo un error con la notificación.");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">🏟️ Programación de Partidos</h1>

      {/* Selección de Torneo y Jornada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <select className="p-3 border rounded-xl shadow-sm bg-white" value={selectedTourId} onChange={e => setSelectedTourId(e.target.value)}>
          <option value="">-- Seleccionar Torneo --</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select className="p-3 border rounded-xl shadow-sm bg-white" value={selectedMatchdayId} onChange={e => setSelectedMatchdayId(e.target.value)} disabled={!selectedTourId}>
          <option value="">-- Seleccionar Jornada --</option>
          {matchdays.map(m => <option key={m.id} value={m.id}>Jornada {m.number}</option>)}
        </select>
      </div>

      {selectedMatchdayId && (
        <>
          <form onSubmit={createMatch} className="bg-white p-8 rounded-2xl border shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Grupo / Sector</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded bg-white font-bold text-blue-600"
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                placeholder="Ej: Grupo A, Grupo B o General"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">🏠 Equipo Local</label>
              <select className="w-full p-2 border rounded-lg" value={localTeamId} onChange={e => setLocalTeamId(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">🚩 Equipo Visitante</label>
              <select className="w-full p-2 border rounded-lg" value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">📅 Fecha y Hora</label>
              <input type="datetime-local" className="w-full p-2 border rounded-lg" value={matchDate} onChange={e => setMatchDate(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">📍 Cancha</label>
              <input type="text" className="w-full p-2 border rounded-lg" value={field} onChange={e => setField(e.target.value)} placeholder="Ej: Campo Central" required />
            </div>

            <button disabled={loading} className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-lg flex justify-center items-center gap-2">
              {loading ? 'ENVIANDO...' : (
                <>
                 <span>PROGRAMAR Y NOTIFICAR</span>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                 </svg>
                </>
              )}
            </button>
          </form>

          {/* LISTA DE PARTIDOS PROGRAMADOS */}
          <div className="grid gap-4">
            <h2 className="text-xl font-bold text-gray-800">Partidos en esta Jornada</h2>
            {matches.length === 0 ? (
              <p className="text-gray-400 italic">No hay partidos programados todavía.</p>
            ) : (
              matches.map((m) => (
                <div key={m.id} className="bg-white p-5 rounded-xl border flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[100px]">
                      <p className="font-bold text-gray-900">{teams.find(t => t.id === m.localTeamId)?.name || 'Local'}</p>
                    </div>
                    <span className="text-gray-300 font-black italic">VS</span>
                    <div className="text-center min-w-[100px]">
                      <p className="font-bold text-gray-900">{teams.find(t => t.id === m.awayTeamId)?.name || 'Visita'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-gray-400 uppercase">{m.field}</p>
                      <p className="text-xs text-gray-500">{new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <button 
                      onClick={() => router.push(`/admin/matches/${m.id}`)}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition shadow-sm ${m.status === 'scheduled' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {m.status === 'scheduled' ? 'Registrar Goles' : 'Ver Resultado'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}