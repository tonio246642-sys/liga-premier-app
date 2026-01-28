'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [teamName, setTeamName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para traer los equipos de la base de datos
  const fetchTeams = async () => {
    try {
      const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(docs);
    } catch (error) {
      console.error("Error al cargar equipos:", error);
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  // Función para guardar un nuevo equipo
  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        // Usamos una imagen genérica si el usuario no pone link
        logoUrl: logoUrl || 'https://via.placeholder.com/150?text=Sin+Escudo',
        createdAt: serverTimestamp(),
      });
      setTeamName('');
      setLogoUrl('');
      fetchTeams(); // Refresca la lista automáticamente
    } catch (error) { 
      console.error("Error al guardar:", error); 
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">🛡️ Gestión de Equipos</h1>
      
      {/* Formulario de Registro */}
      <form onSubmit={createTeam} className="bg-white p-6 rounded-xl shadow-sm border mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Equipo</label>
          <input
            type="text"
            placeholder="Ej: Real Madrid"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL del Escudo (Link)</label>
          <input
            type="text"
            placeholder="https://link-de-la-imagen.com/logo.png"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>
        <button 
          disabled={loading} 
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition disabled:bg-gray-400"
        >
          {loading ? 'Guardando...' : 'Registrar Equipo'}
        </button>
      </form>

      {/* Cuadrícula de Equipos Registrados */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center hover:shadow-md transition">
            <div className="w-24 h-24 mb-3 flex items-center justify-center">
              <img 
                src={team.logoUrl} 
                alt={team.name} 
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error+Img'; }}
              />
            </div>
            <h3 className="font-bold text-center text-gray-800 text-sm uppercase">{team.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}