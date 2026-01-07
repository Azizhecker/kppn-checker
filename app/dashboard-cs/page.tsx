'use client';
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { Camera, LogOut } from 'lucide-react';

export default function CSDashboard() {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 280 }, false);
      scanner.render((text) => {
        scanner.clear();
        router.push(`/checklist/${text}`);
      }, () => {});
      return () => { scanner.clear(); };
    }
  }, [scanning, router]);

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center font-sans">
      <div className="w-full flex justify-between items-center mb-8">
        <h2 className="font-black text-[#003366] italic">KPPN Lhokseumawe</h2>
        <button onClick={() => router.push('/login')} className="text-red-500"><LogOut size={20}/></button>
      </div>

      <div className="w-full bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-2xl mb-10">
        <p className="text-xs font-bold opacity-60 mb-1 uppercase tracking-widest">Selamat Bekerja,</p>
        <h1 className="text-2xl font-black">Petugas Pelaksana</h1>
      </div>

      {!scanning ? (
        <button 
          onClick={() => setScanning(true)}
          className="w-full py-16 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center gap-4 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all"
        >
          <Camera size={60} strokeWidth={1.5} />
          <span className="font-black text-sm uppercase tracking-tighter">Scan Barcode Ruangan</span>
        </button>
      ) : (
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border-4 border-[#003366] shadow-2xl">
          <div id="reader"></div>
          <button onClick={() => setScanning(false)} className="w-full p-4 bg-red-500 text-white font-black">BATAL</button>
        </div>
      )}
    </div>
  );
}