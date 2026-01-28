'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, where, 
  serverTimestamp, doc, deleteDoc 
} from 'firebase/firestore';

export default function PlayersPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [enrolledTeams, setEnrolledTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    number: '', 
    position: '', 
    photoUrl: '' 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Usamos el diseño del sistema: buscar temporada activa [cite: 35]
      const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
      const seasonSnap = await getDocs(seasonQ);
      
      if (!seasonSnap.empty) {
        const s = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(s);
        
        const teamsSnap = await getDocs(collection(db, `seasons/${s.id}/enrolledTeams`));
        setEnrolledTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedTeamId && activeSeason) {
      const fetchPlayers = async () => {
        // CORRECCIÓN: Eliminamos el orderBy para evitar el error de índices de Firestore
        const q = query(
          collection(db, 'teamPlayers'), 
          where('seasonId', '==', activeSeason.id),
          where('teamId', '==', selectedTeamId)
        );
        const snap = await getDocs(q);
        setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      fetchPlayers();
    }
  }, [selectedTeamId, activeSeason]);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !activeSeason) return;
    setLoading(true);

    try {
      // Seguimos el flujo: Crear jugador y asignar a equipo + temporada [cite: 499, 502]
      await addDoc(collection(db, 'teamPlayers'), {
        fullName: formData.name,
        number: Number(formData.number),
        position: formData.position,
        photoUrl: formData.photoUrl || 'https://via.placeholder.com/150?text=Jugador',
        teamId: selectedTeamId,
        seasonId: activeSeason.id,
        createdAt: serverTimestamp()
      });
      
      setFormData({ name: '', number: '', position: '', photoUrl: '' });
      
      const q = query(
        collection(db, 'teamPlayers'), 
        where('teamId', '==', selectedTeamId), 
        where('seasonId', '==', activeSeason.id)
      );
      const snap = await getDocs(q);
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const deletePlayer = async (playerId: string) => {
    if (window.confirm("¿Deseas eliminar a este jugador?")) {
      try {
        await deleteDoc(doc(db, 'teamPlayers', playerId));
        setPlayers(prev => prev.filter(p => p.id !== playerId));
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🏃 Gestión de Jugadores</h1>

      <div className="mb-8 bg-blue-50 p-5 rounded-xl border border-blue-100">
        <label className="block text-sm font-bold mb-2 text-blue-800 uppercase">1. Selecciona el Equipo:</label>
        <select 
          className="w-full p-3 border rounded-lg bg-white"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          <option value="">-- Seleccionar Equipo --</option>
          {enrolledTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTeamId && (
        <>
          <form onSubmit={addPlayer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 bg-white p-6 rounded-xl border shadow-sm mb-10 items-end">
            <div className="lg:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
              <input type="text" required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="lg:col-span-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Posición</label>
              <select required className="w-full p-2 border rounded" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                <option value="">--</option>
                <option value="Portero">Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Medio">Medio</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Dorsal</label>
              <input type="number" required className="w-full p-2 border rounded" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
            </div>

            <div className="lg:col-span-1">
              <label className="text-xs font-bold text-gray-400 uppercase">URL Foto</label>
              <input type="text" className="w-full p-2 border rounded" value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
            </div>

            <button disabled={loading} className="bg-blue-600 text-white p-2 rounded-lg font-bold hover:bg-blue-700 h-[42px]">
              {loading ? '...' : 'Añadir'}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {players.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center relative">
                <button onClick={() => deletePlayer(p.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <img src={p.photoUrl} className="w-20 h-20 rounded-full object-cover mb-4" onError={(e) => {(e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Jugador'}} />
                <div className="text-center">
                  <p className="text-blue-600 font-black">#{p.number}</p>
                  <h3 className="font-bold text-gray-800">{p.fullName}</h3>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{p.position}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}