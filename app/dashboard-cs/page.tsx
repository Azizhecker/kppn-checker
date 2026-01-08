'use client';
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { Camera, LogOut, X } from 'lucide-react';

export default function CSDashboard() {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let scanner: any = null;

    if (scanning) {
      // Inisialisasi scanner
      scanner = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 15, 
          qrbox: { width: 250, height: 250 },
          // Pengaturan kamera belakang (environment)
          videoConstraints: {
            facingMode: "environment"
          },
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        }, 
        false
      );

      scanner.render(
        (text: string) => {
          // Jika scan berhasil
          scanner.clear().then(() => {
            setScanning(false);
            router.push(`/checklist/${text}`);
          }).catch((err: unknown) => console.error(err));
        },
        (error: any) => {
          // Error scan frame (diamkan saja agar tidak spam log)
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
      }
    };
  }, [scanning, router]);

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center font-sans">
      <div className="w-full flex justify-between items-center mb-8">
        <h2 className="font-black text-[#003366] italic">KPPN Lhokseumawe</h2>
        <button onClick={() => router.push('/')} className="text-red-500 p-2"><LogOut size={20}/></button>
      </div>

      <div className="w-full bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-2xl mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold opacity-60 mb-1 uppercase tracking-widest">Selamat Bekerja,</p>
          <h1 className="text-2xl font-black">Petugas Pelaksana</h1>
        </div>
        <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {!scanning ? (
        <button 
          onClick={() => setScanning(true)}
          className="w-full py-20 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center gap-4 text-slate-400 hover:text-[#003366] hover:border-[#003366] transition-all group"
        >
          <div className="p-6 bg-white rounded-full shadow-lg group-hover:scale-110 transition-transform">
            <Camera size={50} strokeWidth={1.5} className="text-[#003366]" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Scan Barcode Ruangan</span>
        </button>
      ) : (
        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-[#003366] p-4 rounded-t-3xl flex justify-between items-center text-white">
            <span className="text-xs font-black uppercase tracking-widest">Arahkan ke Barcode</span>
            <button onClick={() => setScanning(false)}><X size={20}/></button>
          </div>
          <div id="reader" className="overflow-hidden border-x-4 border-[#003366] bg-black"></div>
          <button 
            onClick={() => setScanning(false)} 
            className="w-full p-5 bg-red-500 text-white font-black rounded-b-3xl shadow-xl active:scale-95 transition-all"
          >
            BATALKAN SCAN
          </button>
        </div>
      )}

      <div className="mt-auto pt-10 text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">Monitoring System v1.0</p>
      </div>
    </div>
  );
}