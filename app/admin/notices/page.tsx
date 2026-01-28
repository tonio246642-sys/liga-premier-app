'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, addDoc, getDocs, query, where, 
  orderBy, serverTimestamp, deleteDoc, doc 
} from 'firebase/firestore';

export default function NoticesPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchContext = async () => {
      // Obtener temporada activa para ligar los avisos 
      const seasonQ = query(collection(db, 'seasons'), where('isActive', '==', true));
      const seasonSnap = await getDocs(seasonQ);
      
      if (!seasonSnap.empty) {
        const s = { id: seasonSnap.docs[0].id, ...seasonSnap.docs[0].data() };
        setActiveSeason(s);
        loadNotices(s.id);
      }
    };
    fetchContext();
  }, []);

  const loadNotices = async (seasonId: string) => {
    // Ordenar por fecha de creación descendente 
    const q = query(
      collection(db, 'notices'), 
      where('seasonId', '==', seasonId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const createNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return;
    setLoading(true);

    try {
      // Paso 3.10: Crear aviso [cite: 523]
      await addDoc(collection(db, 'notices'), {
        title,
        content,
        seasonId: activeSeason.id,
        createdAt: serverTimestamp()
      });
      
      setTitle('');
      setContent('');
      loadNotices(activeSeason.id);
      alert("Aviso publicado con éxito");
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const deleteNotice = async (id: string) => {
    if (window.confirm("¿Eliminar este aviso?")) {
      await deleteDoc(doc(db, 'notices', id));
      loadNotices(activeSeason.id);
    }
  };

  if (!activeSeason) return <p className="p-8 text-center font-bold">⚠️ Activa una temporada primero.</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">📢 Gestión de Avisos</h1>

      {/* Formulario de creación [cite: 299, 416] */}
      <form onSubmit={createNotice} className="bg-white p-6 rounded-2xl border shadow-sm mb-10 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Título del Aviso</label>
          <input 
            type="text" 
            required 
            className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-orange-400" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Contenido / Mensaje</label>
          <textarea 
            required 
            rows={4}
            className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-orange-400" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
          />
        </div>
        <button disabled={loading} className="bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-md">
          {loading ? 'Publicando...' : 'Publicar Aviso'}
        </button>
      </form>

      {/* Lista de avisos publicados [cite: 418] */}
      <div className="space-y-4">
        {notices.map(n => (
          <div key={n.id} className="bg-white p-6 rounded-xl border-l-8 border-orange-500 shadow-sm relative group">
            <button 
              onClick={() => deleteNotice(n.id)}
              className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <h3 className="font-black text-xl text-gray-800 mb-2 uppercase">{n.title}</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{n.content}</p>
            <p className="text-[10px] text-gray-400 mt-4 font-bold">
              PUBLICADO: {n.createdAt?.toDate().toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}