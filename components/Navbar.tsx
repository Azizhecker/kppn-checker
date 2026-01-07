'use client';
import { LayoutDashboard, FileSpreadsheet, LogOut, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function Navbar({ role }: { role: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-64 md:h-screen md:border-r">
      <div className="hidden md:block mb-10 font-black text-[#003366] text-xl">KPPN LHOKSEUMAWE</div>
      <Link href="/admin" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#003366]">
        <LayoutDashboard size={24} /> <span className="text-[10px] font-bold">Dashboard</span>
      </Link>
      <Link href="/admin/rekap" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#003366]">
        <FileSpreadsheet size={24} /> <span className="text-[10px] font-bold">Rekap Excel</span>
      </Link>
      <Link href="/login" className="flex flex-col items-center gap-1 text-red-400">
        <LogOut size={24} /> <span className="text-[10px] font-bold">Keluar</span>
      </Link>
    </nav>
  );
}