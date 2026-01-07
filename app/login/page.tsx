'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    if (!role) return alert('Pilih peran dulu!');
    localStorage.setItem('userRole', role); // Simpan role sementara
    if (role === 'cs') router.push('/dashboard-cs');
    else router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
        <div className="bg-[#003366] w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">E-CHECKLIST</h1>
        <p className="text-slate-400 text-sm mb-8 font-medium font-sans">KPPN Kota Lhokseumawe</p>
        
        <select 
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 outline-none font-bold text-slate-600 appearance-none text-center"
        >
          <option value="">-- PILIH ROLE --</option>
          <option value="cs">PELAKSANA (CS)</option>
          <option value="supervisor">SUPERVISOR</option>
          <option value="manager">MANAGER</option>
        </select>

        <button onClick={handleLogin} className="w-full py-4 bg-[#003366] text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">
          MASUK
        </button>
      </div>
    </div>
  );
}