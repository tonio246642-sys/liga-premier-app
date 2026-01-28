'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, where, 
  serverTimestamp 
} from 'firebase/firestore';

export default function TournamentsPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [enrolledTeams, setEnrolledTeams] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  
  // Paso 3.5: Estados para la creación
  const [name, setName] = useState('');
  const [type, setType] = useState('round_robin'); // Por defecto todos contra todos
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
      const seasonSnap = await getDocs(seasonQ);
      
      if (!seasonSnap.empty) {
        const s = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(s);
        
        // Cargar equipos inscritos para asignar al torneo
        const teamsSnap = await getDocs(collection(db, `seasons/${s.id}/enrolledTeams`));
        setEnrolledTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Listar torneos existentes
        const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', s.id));
        const tourSnap = await getDocs(tourQ);
        setTournaments(tourSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    init();
  }, []);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return;
    setLoading(true);

    try {
      // Paso 3.5: Crear torneo con equipos y tipo
      await addDoc(collection(db, 'tournaments'), {
        name,
        seasonId: activeSeason.id,
        type, // Todos contra todos, Grupos, etc. 
        teamIds: enrolledTeams.map(t => t.id), // Asignar equipos 
        createdAt: serverTimestamp()
      });
      
      setName('');
      // Refrescar lista
      const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', activeSeason.id));
      const tourSnap = await getDocs(tourQ);
      setTournaments(tourSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  if (!activeSeason) return <div className="p-8 text-center text-red-500 font-bold">⚠️ Activa una temporada primero.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">🏆 Gestión de Torneos</h1>

      <form onSubmit={createTournament} className="bg-white p-6 rounded-xl border shadow-sm mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
          <input 
            type="text" 
            required 
            placeholder="Ej: Liga Regular"
            className="w-full p-2 border rounded mt-1" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Torneo</label>
          <select 
            className="w-full p-2 border rounded mt-1"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="round_robin">Todos contra todos</option>
            <option value="groups">Por Grupos</option>
            <option value="eliminatory">Eliminatoria Directa</option>
          </select>
        </div>
        <button disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 h-[42px]">
          {loading ? 'Creando...' : 'Crear Torneo'}
        </button>
      </form>

      <div className="grid gap-4">
        {tournaments.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center border-l-8 border-l-indigo-500">
            <div>
              <h3 className="font-bold text-xl text-gray-800 uppercase">{t.name}</h3>
              <p className="text-sm text-gray-500 italic">
                Tipo: {t.type === 'round_robin' ? 'Todos contra todos' : t.type === 'groups' ? 'Grupos' : 'Eliminatoria'}
              </p>
            </div>
            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-black text-xs">
              {t.teamIds?.length || 0} EQUIPOS ASIGNADOS
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}