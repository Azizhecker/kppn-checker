'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Check, X, MapPin, Clock, Calendar, AlertCircle, 
  Filter, ChevronLeft, ChevronRight, Info 
} from 'lucide-react';

function RoomMonitoringContent() {
  const searchParams = useSearchParams();
  const locId = searchParams.get('loc');
  
  const [location, setLocation] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (locId) fetchRoomData();
  }, [locId, filterType, selectedDate, selectedMonth, selectedYear]);

  async function fetchRoomData() {
    setLoading(true);
    
    // 1. Ambil Nama Lokasi
    const { data: locData } = await supabase.from('locations').select('*').eq('id', locId).single();
    setLocation(locData);

    // 2. Query Logs - PERBAIKAN: Filter Status DIHAPUS agar data non-approve tetap muncul
    let query = supabase
      .from('checklist_logs')
      .select(`
        *,
        checklist_items (
          is_completed,
          task_templates (task_name)
        )
      `)
      .eq('location_id', locId)
      // Baris status filter dihapus di sini
      .order('created_at', { ascending: false });

    // Filter Waktu
    if (filterType === 'daily') {
      query = query.gte('created_at', `${selectedDate}T00:00:00`)
                   .lte('created_at', `${selectedDate}T23:59:59`);
    } else {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
      query = query.gte('created_at', firstDay).lte('created_at', lastDay);
    }

    const { data: logsData, error } = await query;
    
    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(logsData || []);
    }
    
    setLoading(false);
  }

  const getMissingDays = () => {
    if (filterType !== 'monthly') return [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const today = new Date().getDate();
    const limit = selectedMonth === new Date().getMonth() + 1 ? today : daysInMonth;
    
    const filledDays = logs.map(l => new Date(l.created_at).getDate());
    const missing = [];
    
    for (let i = 1; i <= limit; i++) {
      if (!filledDays.includes(i)) missing.push(i);
    }
    return missing;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 tracking-widest text-xs">MEMPROSES DATA MONITORING...</div>;
  
  if (!location) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
      <AlertCircle size={64} className="text-red-500 mb-4"/>
      <h1 className="text-2xl font-black text-slate-800 uppercase italic">Ruangan Tidak Terdaftar</h1>
      <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-tighter">Scan QR Code kembali atau hubungi Administrator.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER DASHBOARD */}
      <div className="bg-[#001f3f] text-white p-8 rounded-b-[3rem] shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-blue-500 p-4 rounded-3xl shadow-lg shadow-blue-900/50"><MapPin size={32}/></div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">{location.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-blue-300 font-bold text-[10px] uppercase">
                <span className="bg-white/10 px-2 py-0.5 rounded tracking-widest font-mono">ID: {location.id}</span>
                <span>•</span>
                <span className="tracking-widest italic">Live Cleaning Reports</span>
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
            <button 
              onClick={() => setFilterType('daily')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${filterType === 'daily' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >Harian</button>
            <button 
              onClick={() => setFilterType('monthly')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${filterType === 'monthly' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >Bulanan</button>
            
            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

            {filterType === 'daily' ? (
              <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="bg-white/10 text-white text-[10px] font-black outline-none cursor-pointer px-3 rounded-xl border border-white/10 hover:bg-white/20 transition-all uppercase"/>
            ) : (
              <select value={selectedMonth} onChange={(e)=>setSelectedMonth(parseInt(e.target.value))} className="bg-white/10 text-white text-[10px] font-black outline-none cursor-pointer px-3 rounded-xl border border-white/10 hover:bg-white/20 transition-all uppercase">
                {Array.from({length:12}, (_,i)=> (
                  <option key={i+1} value={i+1} className="text-black font-bold">{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 pb-24">
        {/* ALERT UNTUK TANGGAL YANG TERLEWAT */}
        {filterType === 'monthly' && getMissingDays().length > 0 && (
          <div className="bg-white border-l-[10px] border-red-500 p-6 rounded-3xl mb-8 shadow-2xl flex items-start gap-5 animate-in slide-in-from-top-5 duration-700">
            <div className="bg-red-50 p-4 rounded-2xl text-red-600 shrink-0 shadow-sm"><AlertCircle size={28}/></div>
            <div>
              <h4 className="text-sm font-black text-red-900 uppercase italic tracking-widest">Informasi Kehadiran Petugas</h4>
              <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase leading-relaxed tracking-tight">
                Ruangan ini tercatat belum dibersihkan pada tanggal berikut: <br/>
                <span className="text-red-600 font-black text-xs inline-block mt-2 bg-red-50 px-2 py-1 rounded-md border border-red-100">{getMissingDays().join(', ')} {new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear}</span>
              </p>
            </div>
          </div>
        )}

        {/* TABEL DATA HASIL CEKLIST */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b-2 border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase italic tracking-[0.2em]">Data Petugas</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase italic tracking-[0.2em]">Item Pekerjaan</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase italic tracking-[0.2em]">Keterangan/Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-28 text-center">
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-50 p-6 rounded-full text-slate-200 mb-4"><Info size={40}/></div>
                        <span className="font-black italic uppercase tracking-[0.2em] text-slate-300 text-xl">Belum Ada Laporan</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Data kebersihan untuk periode ini tidak ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-all duration-300 group">
                    <td className="p-6 align-top">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 uppercase italic tracking-tighter">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}
                        </span>
                        <span className="text-[10px] font-bold text-blue-500 mt-1.5 flex items-center gap-1">
                          <Clock size={10}/> {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} WIB
                        </span>
                        <div className="mt-5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black border border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-700 transition-all duration-500">
                            {log.worker_name?.charAt(0)}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{log.worker_name}</span>
                        </div>
                        {/* Label Status Real-Time */}
                        <div className={`mt-3 self-start px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.status === 'DISETUJUI' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {log.status || 'MENUNGGU VERIFIKASI'}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {log.checklist_items?.map((item: any, idx: number) => (
                          <div key={idx} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-300 ${item.is_completed ? 'bg-green-50/40 border-green-100/50 text-green-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                            <div className={`shrink-0 p-1 rounded-md ${item.is_completed ? 'bg-green-500 text-white' : 'bg-slate-200 text-white'}`}>
                              {item.is_completed ? <Check size={10} strokeWidth={4}/> : <X size={10} strokeWidth={4}/>}
                            </div>
                            <span className="text-[10px] font-black uppercase italic leading-none">
                              {item.task_templates?.task_name || 'Tugas Spesifik'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 align-top w-64">
                      {log.notes && log.notes !== 'NULL' && log.notes !== 'EMPTY' && log.notes !== 'null' ? (
                        <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden group/note">
                          <div className="flex items-center gap-2 mb-2 text-amber-600">
                            <AlertCircle size={12} className="animate-pulse"/>
                            <span className="text-[9px] font-black uppercase tracking-widest italic font-mono">Laporan Temuan</span>
                          </div>
                          <p className="text-[11px] font-bold text-amber-900 italic leading-relaxed">"{log.notes}"</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 text-slate-300 py-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                          <span className="text-[9px] font-black italic uppercase tracking-tighter">Area Terpantau Bersih</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* FOOTER BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-[#001f3f]/90 text-white/40 px-8 py-4 rounded-3xl shadow-2xl border border-white/5 text-[8px] font-black uppercase tracking-[0.4em] backdrop-blur-xl flex justify-center text-center">
        KPPN Lhokseumawe • Digital Hygiene Monitoring • 2026
      </div>
    </div>
  );
}

export default function RoomMonitoringPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 italic text-xs tracking-widest">MENYIAPKAN PANEL MONITORING...</div>}>
      <RoomMonitoringContent />
    </Suspense>
  );
}