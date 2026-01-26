'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, UserCog, Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Akses Ditolak: ' + error.message);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Ornamen Background Geometris Khas Aplikasi Kemenkeu */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#003366]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-3xl" />

      {/* Identitas Instansi */}
      <div className="mb-8 text-center z-10">
        <div className="flex justify-center items-center gap-3 mb-4">
           {/* Placeholder Logo Garuda/Kemenkeu */}
          <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center shadow-lg border-b-4 border-yellow-500">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div className="text-left border-l-2 border-slate-300 pl-3">
            <h2 className="text-[#003366] font-black text-xl leading-none tracking-tight">KEMENTERIAN KEUANGAN</h2>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em]">REPUBLIK INDONESIA</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,51,102,0.1)] border border-slate-200 overflow-hidden z-10">
        {/* Header Biru Khas Kemenkeu */}
        <div className="bg-[#003366] p-6 text-center border-b-4 border-yellow-500">
          <h3 className="text-white font-bold text-lg uppercase tracking-wider">E-Checklist KPPN</h3>
          <p className="text-blue-200 text-xs mt-1 font-medium italic">Digital Monitoring System Lhokseumawe</p>
        </div>

        <div className="p-8">
          {!isAdminMode ? (
            <div className="space-y-4">
              {/* Jalur Petugas */}
              <button 
                onClick={() => router.push('/dashboard-cs')}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-xl hover:border-[#003366] hover:bg-slate-50 transition-all group shadow-sm"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-[#003366] group-hover:bg-[#003366] group-hover:text-white transition-all">
                  <QrCode size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Portal Utama</p>
                  <p className="font-black text-[#003366] uppercase text-sm">Petugas Layanan / CS</p>
                </div>
              </button>

              {/* Jalur Admin */}
              <button 
                onClick={() => setIsAdminMode(true)}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-xl hover:border-[#003366] hover:bg-slate-50 transition-all group shadow-sm"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-[#003366] group-hover:bg-[#003366] group-hover:text-white transition-all">
                  <UserCog size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Akses Terbatas</p>
                  <p className="font-black text-[#003366] uppercase text-sm">Administrator Login</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autentikasi Admin</span>
                <button type="button" onClick={() => setIsAdminMode(false)} className="text-[#003366] text-[10px] font-black uppercase hover:underline">Kembali</button>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Email Kedinasan</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={16}/>
                    <input 
                      type="email" placeholder="contoh@kemenkeu.go.id" required
                      className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#003366] focus:bg-white font-bold text-sm transition-all"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Kata Sandi</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={16}/>
                    <input 
                      type="password" placeholder="••••••••" required
                      className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#003366] focus:bg-white font-bold text-sm transition-all"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-[#003366] text-white rounded-lg font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-[#002244] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Masuk ke Sistem"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center z-10">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          Direktorat Jenderal Perbendaharaan
        </p>
        <p className="text-[9px] text-slate-300 font-medium uppercase mt-1">
          KPPN Lhokseumawe &copy; 2026 - Versi 2.0.4
        </p>
      </div>
    </div>
  );
}