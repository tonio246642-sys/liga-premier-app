'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [team, setTeam] = useState<any>(null);
  const [groupedPlayers, setGroupedPlayers] = useState<any>({
    goalkeepers: [],
    defenders: [],
    midfielders: [],
    forwards: [],
    unknown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!id) return;
      try {
        // 1. Datos del equipo
        const teamSnap = await getDoc(doc(db, 'teams', id));
        if (teamSnap.exists()) setTeam(teamSnap.data());

        // 2. Jugadores
        const playersSnap = await getDocs(query(
          collection(db, 'teamPlayers'), 
          where('teamId', '==', id)
        ));
        
        // CORRECCIÓN TYPESCRIPT: Especificamos que esto es un array de 'any'
        const allPlayers: any[] = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Lógica de Agrupación (Smart Grouping)
        const groups = {
          goalkeepers: [] as any[],
          defenders: [] as any[],
          midfielders: [] as any[],
          forwards: [] as any[],
          unknown: [] as any[]
        };

        allPlayers.forEach(p => {
          // Ahora TypeScript ya no se quejará de 'p.position'
          const pos = (p.position || '').toLowerCase();
          
          if (pos.includes('porter') || pos.includes('arquero') || pos.includes('gk')) {
            groups.goalkeepers.push(p);
          } else if (pos.includes('defens') || pos.includes('lateral') || pos.includes('central') || pos.includes('zaguero')) {
            groups.defenders.push(p);
          } else if (pos.includes('medio') || pos.includes('volante') || pos.includes('contenci') || pos.includes('interior')) {
            groups.midfielders.push(p);
          } else if (pos.includes('delanter') || pos.includes('ataca') || pos.includes('extremo') || pos.includes('punta') || pos.includes('ariete')) {
            groups.forwards.push(p);
          } else {
            groups.unknown.push(p);
          }
        });

        // Ordenar cada grupo por número de camiseta
        Object.keys(groups).forEach(key => {
          groups[key as keyof typeof groups].sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number));
        });

        setGroupedPlayers(groups);

      } catch (e) { 
        console.error("Error al cargar la plantilla:", e); 
      } finally {
        setLoading(false);
      }
    };
    fetchTeamData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-sans text-xs text-white/20 uppercase tracking-widest animate-pulse">Cargando Plantilla...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-20 selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <button onClick={() => router.back()} className="text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-all flex items-center gap-2">
          ← Regresar
        </button>
      </nav>

      {/* HERO DEL EQUIPO */}
      <header className="relative pt-32 pb-12 px-6 text-center">
        {/* Fondo sutil difuminado */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-white/5 rounded-full blur-[80px] z-0 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          
          {/* LOGO CORREGIDO: overflow-hidden corta las esquinas cuadradas */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center p-4 shadow-2xl mb-6 overflow-hidden">
             <img 
               src={team?.shieldUrl || team?.logoUrl} 
               className="w-full h-full object-contain" 
               alt={team?.name} 
             />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-2">
            {team?.name || "Equipo"}
          </h1>
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em]">Plantilla Oficial</p>
        </div>
      </header>

      <main className="px-4 max-w-2xl mx-auto space-y-12">
        
        {/* SECCIÓN: PORTEROS */}
        {groupedPlayers.goalkeepers.length > 0 && (
          <PlayerSection title="Porteros" players={groupedPlayers.goalkeepers} />
        )}

        {/* SECCIÓN: DEFENSAS */}
        {groupedPlayers.defenders.length > 0 && (
          <PlayerSection title="Defensas" players={groupedPlayers.defenders} />
        )}

        {/* SECCIÓN: MEDIOCAMPISTAS */}
        {groupedPlayers.midfielders.length > 0 && (
          <PlayerSection title="Mediocampistas" players={groupedPlayers.midfielders} />
        )}

        {/* SECCIÓN: DELANTEROS */}
        {groupedPlayers.forwards.length > 0 && (
          <PlayerSection title="Delanteros" players={groupedPlayers.forwards} />
        )}

        {/* SECCIÓN: SIN POSICIÓN (Fallback) */}
        {groupedPlayers.unknown.length > 0 && (
          <PlayerSection title="Reserva / Sin Posición" players={groupedPlayers.unknown} />
        )}

        {/* MENSAJE SI NO HAY JUGADORES */}
        {Object.values(groupedPlayers).every((arr: any) => arr.length === 0) && (
           <div className="p-10 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
             <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">No hay jugadores registrados</p>
           </div>
        )}

      </main>
    </div>
  );
}

// --- COMPONENTE REUTILIZABLE ---
function PlayerSection({ title, players }: { title: string, players: any[] }) {
  return (
    <section>
      <div className="flex items-center gap-4 mb-6">
         <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
         <div className="h-px bg-white/10 flex-1"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {players.map(p => (
          <Link href={`/stats/player/${p.id}`} key={p.id} className="group block">
            <div className="flex items-center p-3 rounded-2xl bg-neutral-900/40 border border-white/5 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer">
              
              {/* Foto Jugador */}
              <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden border border-white/10 shrink-0 relative">
                {p.photoUrl ? (
                   <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                   <img src={`https://ui-avatars.com/api/?name=${p.fullName}&background=171717&color=fff&font-size=0.33`} className="w-full h-full object-cover" alt="" />
                )}
              </div>

              {/* Info */}
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-bold text-white uppercase truncate group-hover:text-blue-400 transition-colors">
                  {p.fullName}
                </p>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  {p.position || title.slice(0, -1)}
                </p>
              </div>

              {/* Número */}
              <div className="pr-2">
                 <span className="text-2xl font-black italic text-white/10 group-hover:text-white/30 transition-colors tracking-tighter">
                   {p.number}
                 </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}