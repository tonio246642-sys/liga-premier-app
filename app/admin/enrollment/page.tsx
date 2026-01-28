'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';

export default function EnrollmentPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Detectar temporada activa
      const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
      const seasonSnap = await getDocs(seasonQ);
      
      if (!seasonSnap.empty) {
        const seasonData = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(seasonData);

        // 2. Traer IDs de equipos ya inscritos en esta temporada
        const enrolledQ = collection(db, `seasons/${seasonData.id}/enrolledTeams`);
        const enrolledSnap = await getDocs(enrolledQ);
        setEnrolledIds(enrolledSnap.docs.map(d => d.id));
      }

      // 3. Cargar todos los equipos existentes
      const teamsQ = query(collection(db, 'teams'), orderBy('name', 'asc'));
      const teamsSnap = await getDocs(teamsQ);
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleEnrollment = async (team: any) => {
    if (!activeSeason) return;
    const isEnrolled = enrolledIds.includes(team.id);
    const enrollmentRef = doc(db, `seasons/${activeSeason.id}/enrolledTeams`, team.id);

    try {
      if (isEnrolled) {
        await deleteDoc(enrollmentRef);
        setEnrolledIds(prev => prev.filter(id => id !== team.id));
      } else {
        await setDoc(enrollmentRef, {
          name: team.name,
          logoUrl: team.logoUrl,
          enrolledAt: new Date()
        });
        setEnrolledIds(prev => [...prev, team.id]);
      }
    } catch (error) {
      console.error("Error en inscripción:", error);
    }
  };

  if (loading) return <p className="p-8 text-center">Cargando...</p>;
  if (!activeSeason) return <p className="p-8 text-center text-red-500 font-bold">⚠️ Activa una temporada primero para poder inscribir equipos.</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">📝 Inscripción a {activeSeason.name}</h1>
        <p className="text-gray-500 mt-1">Selecciona los equipos que participarán en este torneo.</p>
      </header>

      <div className="grid gap-3">
        {teams.map((team) => {
          const isEnrolled = enrolledIds.includes(team.id);
          return (
            <div key={team.id} className={`p-4 rounded-lg border flex items-center justify-between ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <img src={team.logoUrl} alt="" className="w-12 h-12 object-contain" />
                <span className="font-bold text-lg uppercase">{team.name}</span>
              </div>
              <button 
                onClick={() => toggleEnrollment(team)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition ${isEnrolled ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}
              >
                {isEnrolled ? 'REMOVER' : 'INSCRIBIR'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}