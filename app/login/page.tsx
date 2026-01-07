'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, UserCog, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Ganti ini dengan sistem autentikasi asli atau cek sederhana
    if (username === 'admin' && password === 'kppn123') {
      router.push('/admin');
    } else {
      alert('Akun Admin salah!');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-10 text-center">
        <div className="bg-[#003366] w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-xl">
          <Lock size={30} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">E-Checklist KPPN</h1>
        <p className="text-slate-500 font-medium text-sm">Pilih akses masuk Anda</p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-slate-100">
        {!isAdminMode ? (
          <div className="space-y-4">
            {/* Tombol Jalur CS */}
            <button 
              onClick={() => router.push('/dashboard-cs')}
              className="group w-full p-6 bg-[#003366] text-white rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              <QrCode size={40} className="group-hover:scale-110 transition-transform"/>
              <div className="text-center">
                <span className="block font-black text-lg uppercase">Mulai Ceklist</span>
                <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest text-blue-200">Khusus Petugas CS (Tanpa Login)</span>
              </div>
            </button>

            {/* Tombol Jalur Admin */}
            <button 
              onClick={() => setIsAdminMode(true)}
              className="w-full p-6 bg-slate-50 text-slate-600 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center gap-3 transition-all hover:border-blue-200 active:scale-95"
            >
              <UserCog size={30} />
              <span className="font-bold text-sm uppercase">Login Admin / Supervisor</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4 mb-6">
               <button onClick={() => setIsAdminMode(false)} className="text-slate-400 text-sm font-bold">← Kembali</button>
               <h2 className="font-black text-slate-800 uppercase">Login Khusus Admin</h2>
            </div>
            
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="text" placeholder="Username" required
                className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="password" placeholder="Password" required
                className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-4 bg-[#003366] text-white rounded-2xl font-black shadow-lg shadow-blue-100 uppercase tracking-widest text-sm">Masuk Dashboard</button>
          </form>
        )}
      </div>

      <p className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">KPPN Lhokseumawe &copy; 2025</p>
    </div>
  );
}