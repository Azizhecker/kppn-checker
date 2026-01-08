'use client';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, LogOut, ArrowRight } from 'lucide-react';

export default function CSDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center font-sans">
      <div className="w-full flex justify-between items-center mb-8">
        <h2 className="font-black text-[#003366] italic uppercase tracking-tighter">KPPN Lhokseumawe</h2>
        <button onClick={() => router.push('/')} className="text-red-500 p-2"><LogOut size={20}/></button>
      </div>

      <div className="w-full bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-2xl mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold opacity-60 mb-1 uppercase tracking-widest">Aplikasi Monitoring</p>
          <h1 className="text-2xl font-black">Petugas CS</h1>
        </div>
        <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      <div className="w-full space-y-6">
        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
          <h3 className="font-bold text-[#003366] mb-2">Instruksi Kerja:</h3>
          <ul className="text-xs text-slate-600 space-y-2 font-medium">
            <li>1. Klik tombol "Mulai Laporan" di bawah.</li>
            <li>2. Pilih lokasi ruangan yang dibersihkan.</li>
            <li>3. Isi nama petugas dan centang tugas.</li>
            <li>4. Klik Kirim Laporan.</li>
          </ul>
        </div>

        <button 
          onClick={() => router.push('/checklist/form')}
          className="w-full py-8 bg-[#003366] text-white rounded-[2.5rem] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all shadow-blue-200"
        >
          <ClipboardCheck size={30} />
          <span className="font-black text-xl uppercase italic">Mulai Laporan</span>
          <ArrowRight size={20} />
        </button>
      </div>

      <div className="mt-auto pt-10 text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">Manual Selection Mode v2.0</p>
      </div>
    </div>
  );
}