'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  serverTimestamp, writeBatch, doc 
} from 'firebase/firestore';

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(''); // Ahora será opcional
  const [loading, setLoading] = useState(false);

  const fetchSeasons = async () => {
    const q = query(collection(db, 'seasons'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSeasons(docs);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const createSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'seasons'), {
        name: seasonName,
        startDate,
        endDate: endDate || null, // Si está vacío, se guarda como nulo
        isActive: false,
        createdAt: serverTimestamp(),
      });
      setSeasonName('');
      setStartDate('');
      setEndDate('');
      fetchSeasons();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleActivate = async (seasonId: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      seasons.forEach((s) => {
        if (s.isActive) batch.update(doc(db, 'seasons', s.id), { isActive: false });
      });
      batch.update(doc(db, 'seasons', seasonId), { isActive: true });
      await batch.commit();
      fetchSeasons();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">📅 Gestión de Temporadas</h1>
      
      <form onSubmit={createSeason} className="bg-white p-6 rounded-xl shadow-sm border mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Temporada</label>
          <input
            type="text"
            placeholder="Ej: Torneo Apertura 2026"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
          <input
            type="date"
            className="w-full p-2 border rounded-lg"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin (Opcional)</label>
          <input
            type="date"
            className="w-full p-2 border rounded-lg"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
            {loading ? 'Guardando...' : 'Registrar Temporada'}
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {seasons.map((season) => (
          <div key={season.id} className={`p-5 rounded-xl border flex justify-between items-center transition ${season.isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-800">{season.name}</h3>
                {season.isActive && <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-black">ACTIVA</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Inicia: <span className="font-medium text-gray-700">{season.startDate}</span> 
                {season.endDate ? ` — Termina: ${season.endDate}` : ' (Final por definir)'}
              </p>
            </div>
            {!season.isActive && (
              <button 
                onClick={() => handleActivate(season.id)}
                className="bg-gray-800 text-white px-5 py-2 rounded-lg hover:bg-black transition text-sm font-medium"
              >
                Activar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}