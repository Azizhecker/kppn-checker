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

    // 2. Query Logs - PERBAIKAN: Status disamakan dengan Database (DISETUJUI)
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
      .ilike('status', 'DISETUJUI') // Gunakan ilike agar tidak masalah huruf besar/kecil
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 tracking-widest">MEMPROSES DATA...</div>;
  
  if (!location) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
      <AlertCircle size={64} className="text-red-500 mb-4"/>
      <h1 className="text-2xl font-black text-slate-800 uppercase italic">Ruangan Tidak Terdaftar</h1>
      <p className="text-slate-500 font-bold text-sm mt-2 uppercase">Pastikan QR Code yang di-scan sudah benar.</p>
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
                <span className="bg-white/10 px-2 py-0.5 rounded tracking-widest">ID: {location.id}</span>
                <span>•</span>
                <span className="tracking-widest">Laporan Kebersihan Real-Time</span>
              </div>
            </div>
          </div>

          {/* FILTER */}
          <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
            <button 
              onClick={() => setFilterType('daily')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/10 text-white/60'}`}
            >Harian</button>
            <button 
              onClick={() => setFilterType('monthly')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/10 text-white/60'}`}
            >Bulanan</button>
            
            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

            {filterType === 'daily' ? (
              <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer p-1 rounded hover:bg-white/5"/>
            ) : (
              <select value={selectedMonth} onChange={(e)=>setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer p-1 rounded hover:bg-white/5">
                {Array.from({length:12}, (_,i)=> (
                  <option key={i+1} value={i+1} className="text-black">{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 pb-20">
        {/* NOTIFIKASI BOLONG (MISSING DAYS) */}
        {filterType === 'monthly' && getMissingDays().length > 0 && (
          <div className="bg-white border-l-8 border-red-500 p-6 rounded-[2rem] mb-6 shadow-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-red-50 p-3 rounded-2xl text-red-500"><AlertCircle size={24}/></div>
            <div>
              <h4 className="text-sm font-black text-red-800 uppercase italic tracking-wider">Laporan Tidak Ditemukan!</h4>
              <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase leading-relaxed">
                Ruangan ini tidak dibersihkan pada tanggal: <br/>
                <span className="text-red-600 font-black text-xs">{getMissingDays().join(', ')} {new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})}</span>
              </p>
            </div>
          </div>
        )}

        {/* TABEL STYLE EXCEL */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden shadow-blue-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="p-6 text-[11px] font-black text-slate-400 uppercase italic tracking-widest">Waktu & Petugas</th>
                  <th className="p-6 text-[11px] font-black text-slate-400 uppercase italic tracking-widest">Daftar Pekerjaan</th>
                  <th className="p-6 text-[11px] font-black text-slate-400 uppercase italic tracking-widest">Laporan/Temuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <AlertCircle size={48}/>
                        <span className="mt-4 font-black italic uppercase tracking-tighter text-2xl">Data Masih Kosong</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-all duration-200">
                    <td className="p-6 align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}
                        </span>
                        <span className="text-[11px] font-bold text-blue-600 mt-1">Pukul {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} WIB</span>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg"><Clock size={12}/></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.worker_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {log.checklist_items?.map((item: any, idx: number) => (
                          <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all ${item.is_completed ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            {item.is_completed ? <Check size={12} strokeWidth={4}/> : <X size={12} strokeWidth={4}/>}
                            <span className="text-[10px] font-black uppercase italic leading-none truncate">
                              {item.task_templates?.task_name || 'Tugas Terhapus'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 align-top">
                      {log.notes && log.notes !== 'NULL' && log.notes !== 'EMPTY' ? (
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                             <AlertCircle size={24}/>
                           </div>
                          <div className="flex items-center gap-2 mb-2 text-amber-600">
                            <Info size={12}/>
                            <span className="text-[9px] font-black uppercase tracking-widest italic">Laporan Kerusakan</span>
                          </div>
                          <p className="text-[11px] font-bold text-amber-900 italic leading-relaxed">"{log.notes}"</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Check size={14} className="opacity-50"/>
                          <span className="text-[10px] font-bold italic uppercase tracking-tighter">Semua Normal</span>
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
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#001f3f] text-white/50 px-8 py-4 rounded-full shadow-2xl border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-xl">
        KPPN Lhokseumawe • Digital Monitoring Board
      </div>
    </div>
  );
}

export default function RoomMonitoringPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 italic">MEMUAT DASHBOARD...</div>}>
      <RoomMonitoringContent />
    </Suspense>
  );
}