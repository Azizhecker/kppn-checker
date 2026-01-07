'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, ShieldAlert, Lock, User } from 'lucide-react';

export default function EntryPage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // Default Password (Bisa Anda ubah di sini)
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "kppn123"; 

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      router.push('/admin');
    } else {
      alert('Username atau Password Admin Salah!');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white">
        <div className="text-center mb-8">
          <div className="bg-[#003366] w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-black text-slate-800 uppercase italic">KPPN LHOKSEUMAWE</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">E-Monitoring System</p>
        </div>

        {!isAdminMode ? (
          <div className="space-y-4">
            {/* JALUR CS: Tanpa Login, Langsung Scan */}
            <button 
              onClick={() => router.push('/dashboard-cs')}
              className="w-full p-6 bg-[#003366] text-white rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-900 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              <QrCode size={40} />
              <div className="text-center">
                <span className="block font-black text-lg">PELAKSANA CS</span>
                <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Klik untuk Scan Barcode</span>
              </div>
            </button>

            {/* JALUR ADMIN: Harus Login */}
            <button 
              onClick={() => setIsAdminMode(true)}
              className="w-full p-4 bg-slate-50 text-slate-500 rounded-2xl border-2 border-slate-100 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
            >
              <Lock size={18} />
              LOGIN ADMIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-slate-800 uppercase text-sm">Verifikasi Admin</h2>
              <button onClick={() => setIsAdminMode(false)} className="text-red-500 text-xs font-bold uppercase tracking-tighter">Batal</button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" placeholder="Username" required
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-600"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" placeholder="Password" required
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-600"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-[#003366] text-white rounded-2xl font-black shadow-lg shadow-blue-100 mt-2">MASUK PANEL ADMIN</button>
            <p className="text-[9px] text-center text-slate-400 font-bold italic mt-4">Pastikan Anda memiliki kewenangan Supervisor/Manager</p>
          </form>
        )}
      </div>
    </div>
  );
}