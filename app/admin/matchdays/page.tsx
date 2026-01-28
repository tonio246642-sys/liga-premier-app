'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, where, 
  serverTimestamp, doc, deleteDoc 
} from 'firebase/firestore';

export default function MatchdaysPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [matchdays, setMatchdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Cargar contexto inicial
  useEffect(() => {
    const init = async () => {
      const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
      const seasonSnap = await getDocs(seasonQ);
      if (!seasonSnap.empty) {
        const s = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(s);
        const tourQ = query(collection(db, 'tournaments'), where('seasonId', '==', s.id));
        const tourSnap = await getDocs(tourQ);
        setTournaments(tourSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    init();
  }, []);

  // 2. Traer y ordenar jornadas 
  useEffect(() => {
    if (selectedTourId) {
      fetchMatchdays();
    }
  }, [selectedTourId]);

  const fetchMatchdays = async () => {
    const q = query(collection(db, 'matchdays'), where('tournamentId', '==', selectedTourId));
    const snap = await getDocs(q);
    const sortedDocs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => a.number - b.number);
    setMatchdays(sortedDocs);
  };

  // 3. Crear y numerar jornada [cite: 508, 509]
  const createNextMatchday = async () => {
    if (!selectedTourId) return;
    setLoading(true);
    try {
      const nextNumber = matchdays.length + 1;
      await addDoc(collection(db, 'matchdays'), {
        tournamentId: selectedTourId, // Relacionar con torneo 
        number: nextNumber, // Numerar automáticamente 
        createdAt: serverTimestamp()
      });
      await fetchMatchdays();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // 4. Función de seguridad: Eliminar última jornada
  const deleteLastMatchday = async () => {
    if (matchdays.length === 0) return;
    const lastMatchday = matchdays[matchdays.length - 1];
    if (window.confirm(`¿Seguro que quieres eliminar la Jornada ${lastMatchday.number}?`)) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'matchdays', lastMatchday.id));
        await fetchMatchdays();
      } catch (error) { console.error(error); }
      setLoading(false);
    }
  };

  if (!activeSeason) return <div className="p-8 text-center font-bold">⚠️ Activa una temporada primero.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">📅 Etapa 3.6: Jornadas</h1>

      <div className="mb-8 bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
        <label className="block text-sm font-bold mb-2 text-indigo-800 uppercase">Selecciona el Torneo:</label>
        <select 
          className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedTourId}
          onChange={(e) => setSelectedTourId(e.target.value)}
        >
          <option value="">-- Elige un torneo --</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTourId && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-700 uppercase">Calendario de Fechas</h2>
            <div className="flex gap-2">
              <button 
                onClick={deleteLastMatchday}
                disabled={loading || matchdays.length === 0}
                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition disabled:opacity-50"
              >
                Eliminar Última
              </button>
              <button 
                onClick={createNextMatchday}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-400"
              >
                {loading ? '...' : '+ Nueva Jornada'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {matchdays.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-xl border-2 border-gray-100 flex flex-col items-center hover:border-indigo-300 transition shadow-sm">
                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Jornada</span>
                <span className="text-4xl font-black text-indigo-600">{m.number}</span>
              </div>
            ))}
          </div>

          {matchdays.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No has generado jornadas para este torneo aún.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}