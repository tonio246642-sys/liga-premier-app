'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default function StandingsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [standings, setStandings] = useState<any[]>([]);
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

  // 2. Calcular Tabla cuando cambie el torneo
  useEffect(() => {
    if (selectedTourId) {
      calculateStandings();
    }
  }, [selectedTourId]);

  const calculateStandings = async () => {
    setLoading(true);
    try {
      // Traer todos los partidos JUGADOS del torneo 
      const matchesQ = query(
        collection(db, 'matches'), 
        where('tournamentId', '==', selectedTourId),
        where('status', '==', 'played')
      );
      const matchesSnap = await getDocs(matchesQ);
      const matches = matchesSnap.docs.map(d => d.data());

      // Traer nombres de equipos para mostrar
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData: any = {};
      teamsSnap.forEach(doc => {
        teamsData[doc.id] = doc.data();
      });

      const stats: any = {};

      matches.forEach((m: any) => {
        // Inicializar equipos si no existen en el objeto de stats
        [m.localTeamId, m.awayTeamId].forEach(id => {
          if (!stats[id]) {
            stats[id] = { 
              id, 
              name: teamsData[id]?.name || id,
              pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 
            };
          }
        });

        const local = stats[m.localTeamId];
        const away = stats[m.awayTeamId];

        // Sumar estadísticas básicas [cite: 135, 139, 140]
        local.pj++; away.pj++;
        local.gf += m.localGoals; local.gc += m.awayGoals;
        away.gf += m.awayGoals; away.gc += m.localGoals;

        // Lógica de puntos (3-1-0) [cite: 136, 137, 138, 141]
        if (m.localGoals > m.awayGoals) {
          local.pg++; local.pts += 3;
          away.pp++;
        } else if (m.localGoals < m.awayGoals) {
          away.pg++; away.pts += 3;
          local.pp++;
        } else {
          local.pe++; local.pts += 1;
          away.pe++; away.pts += 1;
        }
        
        local.dg = local.gf - local.gc;
        away.dg = away.gf - away.gc;
      });

      // Ordenar: Puntos > Dif Goles > Goles Favor 
      const sortedStandings = Object.values(stats).sort((a: any, b: any) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        return b.gf - a.gf;
      });

      setStandings(sortedStandings);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">📊 Tabla de Posiciones</h1>

      <div className="mb-8">
        <select 
          className="w-full md:w-1/3 p-3 border rounded-xl shadow-sm bg-white font-bold"
          value={selectedTourId}
          onChange={e => setSelectedTourId(e.target.value)}
        >
          <option value="">-- Seleccionar Torneo --</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTourId && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-white uppercase text-xs">
              <tr>
                <th className="p-4">Pos</th>
                <th className="p-4">Equipo</th>
                <th className="p-4 text-center">PJ</th>
                <th className="p-4 text-center">PG</th>
                <th className="p-4 text-center">PE</th>
                <th className="p-4 text-center">PP</th>
                <th className="p-4 text-center">GF</th>
                <th className="p-4 text-center">GC</th>
                <th className="p-4 text-center">DG</th>
                <th className="p-4 text-center bg-blue-800">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {standings.map((team, index) => (
                <tr key={team.id} className="hover:bg-blue-50 transition">
                  <td className="p-4 font-black text-gray-400">{index + 1}</td>
                  <td className="p-4 font-bold text-gray-800">{team.name}</td>
                  <td className="p-4 text-center">{team.pj}</td>
                  <td className="p-4 text-center">{team.pg}</td>
                  <td className="p-4 text-center">{team.pe}</td>
                  <td className="p-4 text-center">{team.pp}</td>
                  <td className="p-4 text-center font-medium text-green-600">{team.gf}</td>
                  <td className="p-4 text-center font-medium text-red-600">{team.gc}</td>
                  <td className="p-4 text-center font-bold text-gray-600">{team.dg}</td>
                  <td className="p-4 text-center font-black text-blue-700 bg-blue-50/50">{team.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {standings.length === 0 && !loading && (
            <p className="p-10 text-center text-gray-400">No hay partidos jugados para generar la tabla.</p>
          )}
        </div>
      )}
    </div>
  );
}