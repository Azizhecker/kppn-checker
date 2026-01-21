'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Check, X, MapPin, Clock, Calendar, AlertCircle, 
  Filter, ChevronLeft, ChevronRight, Info 
} from 'lucide-react';

export default function RoomMonitoringPage() {
  const searchParams = useSearchParams();
  const locId = searchParams.get('loc');
  
  const [location, setLocation] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter
  const [filterType, setFilterType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (locId) fetchRoomData();
  }, [locId, filterType, selectedDate, selectedMonth, selectedYear]);

  async function fetchRoomData() {
    setLoading(true);
    
    // 1. Ambil Detail Lokasi
    const { data: locData } = await supabase.from('locations').select('*').eq('id', locId).single();
    setLocation(locData);

    // 2. Query Logs dengan Filter
    let query = supabase
      .from('checklist_logs')
      .select(`
        *,
        checklist_items(is_completed, task_templates(task_name))
      `)
      .eq('location_id', locId)
      .eq('status', 'Disetujui')
      .order('created_at', { ascending: false });

    if (filterType === 'daily') {
      query = query.gte('created_at', `${selectedDate}T00:00:00`)
                   .lte('created_at', `${selectedDate}T23:59:59`);
    } else {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
      query = query.gte('created_at', firstDay).lte('created_at', lastDay);
    }

    const { data: logsData } = await query;
    setLogs(logsData || []);
    setLoading(false);
  }

  // Logika Notifikasi Bolong (Hanya muncul di filter bulanan)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600">MEMPROSES DATA...</div>;
  if (!location) return <div className="min-h-screen flex items-center justify-center text-red-500 font-black italic">ID RUANGAN TIDAK DITEMUKAN</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER DASHBOARD */}
      <div className="bg-[#001f3f] text-white p-8 rounded-b-[3rem] shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-blue-500 p-4 rounded-3xl shadow-lg shadow-blue-900/50"><MapPin size={32}/></div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">{location.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-blue-300 font-bold text-xs uppercase">
                <span className="bg-white/10 px-2 py-0.5 rounded">ID: {location.id}</span>
                <span>•</span>
                <span>Monitoring Board Kebersihan</span>
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
            <button 
              onClick={() => setFilterType('daily')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'daily' ? 'bg-blue-500 text-white shadow-lg' : 'hover:bg-white/10'}`}
            >Harian</button>
            <button 
              onClick={() => setFilterType('monthly')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'monthly' ? 'bg-blue-500 text-white shadow-lg' : 'hover:bg-white/10'}`}
            >Bulanan</button>
            
            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

            {filterType === 'daily' ? (
              <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none cursor-pointer"/>
            ) : (
              <select value={selectedMonth} onChange={(e)=>setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
                {Array.from({length:12}, (_,i)=> (
                  <option key={i+1} value={i+1} className="text-black">{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 pb-20">
        {/* NOTIFIKASI JIKA ADA HARI YANG TERLEWAT */}
        {filterType === 'monthly' && getMissingDays().length > 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-2xl mb-6 shadow-sm flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20}/>
            <div>
              <h4 className="text-xs font-black text-red-800 uppercase italic">Peringatan Kehadiran!</h4>
              <p className="text-[10px] font-bold text-red-600 mt-1">
                Ditemukan {getMissingDays().length} hari yang tidak memiliki laporan kebersihan di bulan ini: 
                <span className="ml-1 text-red-800 font-black">{getMissingDays().join(', ')}</span>
              </p>
            </div>
          </div>
        )}

        {/* TABEL HASIL CEKLIST (STYLE EXCEL) */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase italic">Waktu & Petugas</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase italic">Detail Pekerjaan</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase italic w-48">Laporan Kerusakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-slate-300 font-bold italic uppercase">Data Tidak Ditemukan</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 leading-none mb-1 uppercase italic">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}
                        </span>
                        <span className="text-[10px] font-bold text-blue-500 mb-2">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} WIB</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{log.worker_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-2">
                        {log.checklist_items?.map((item: any, idx: number) => (
                          <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${item.is_completed ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            {item.is_completed ? <Check size={10} strokeWidth={4}/> : <X size={10} strokeWidth={4}/>}
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.task_templates?.task_name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-5">
                      {log.notes ? (
                        <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                          <div className="flex items-center gap-1 mb-1 text-orange-600">
                            <Info size={10}/>
                            <span className="text-[8px] font-black uppercase tracking-widest">Temuan</span>
                          </div>
                          <p className="text-[10px] font-bold text-orange-800 italic leading-tight">"{log.notes}"</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 italic uppercase">Tidak Ada Kerusakan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white text-[9px] font-black text-slate-400 uppercase tracking-widest">
        KPPN Lhokseumawe • Digital Monitoring System
      </div>
    </div>
  );
}