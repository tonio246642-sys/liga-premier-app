'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El AuthGuard detectará el cambio de sesión y redirigirá automáticamente
      // pero por seguridad forzamos la redirección aquí también.
      router.push('/admin/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas. Intenta de nuevo.');
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 uppercase italic">Admin Access</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Liga Pro</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Correo</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 p-3 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@liga.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 p-3 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loggingIn}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loggingIn ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}