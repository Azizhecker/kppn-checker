'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, UserCheck 
} from 'lucide-react';

function RoomMonitoringContent() {
  const searchParams = useSearchParams();
  const locId = searchParams.get('loc');
  
  const [location, setLocation] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (locId) fetchData();
  }, [locId, selectedMonth, selectedYear]);

  async function fetchData() {
    setLoading(true);
    
    // 1. Ambil Nama Lokasi dan Tipenya (Sesuai gambar DB: kolom 'type')
    const { data: locData } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locId)
      .single();
    
    setLocation(locData);

    // 2. Ambil Daftar Master Task
    // Di database Anda menggunakan kolom 'category' pada task_templates
    if (locData) {
      const { data: taskData } = await supabase
        .from('task_templates')
        .select('*')
        .eq('category', locData.type.toLowerCase()) // Pastikan lowercase sesuai isi DB
        .order('id', { ascending: true });
      
      setTasks(taskData || []);
    }

    // 3. Ambil Logs dalam bulan tersebut
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

    const { data: logsData } = await supabase
      .from('checklist_logs')
      .select(`
        *,
        checklist_items (
          is_completed,
          task_id
        )
      `)
      .eq('location_id', locId)
      .gte('created_at', firstDay)
      .lte('created_at', lastDay);

    setLogs(logsData || []);
    setLoading(false);
  }

  const getWorkerNames = () => {
    if (logs.length === 0) return "Belum ada petugas";
    const names = Array.from(new Set(logs.map(l => l.worker_name).filter(Boolean)));
    return names.join(', ');
  };

  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getCheckStatus = (taskId: number, day: number) => {
    // Mencari log yang dibuat pada tanggal yang sesuai
    const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
    if (!logAtDay) return null;
    
    const item = logAtDay.checklist_items?.find((i: any) => i.task_id === taskId);
    return item?.is_completed ? 'checked' : 'unchecked';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-blue-600 text-xs tracking-widest animate-pulse">MENYINKRONKAN DATA...</p>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#001f3f] text-white p-8 shadow-xl">
        <div className="max-w-[100rem] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-900/50">
              <MapPin size={32}/>
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
                {location?.name}
              </h1>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-[10px] uppercase">
                  <span className="bg-white/10 px-2 py-0.5 rounded tracking-widest font-mono">
                    KATEGORI: {location?.type || 'umum'}
                  </span>
                  <span>•</span>
                  <span className="tracking-widest italic text-white/50">Matrix Monitoring Bulanan</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 font-black text-[11px] uppercase mt-1">
                  <UserCheck size={14} />
                  <span className="tracking-tight italic">Petugas: {getWorkerNames()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white text-xs font-black outline-none cursor-pointer p-2 uppercase"
            >
              {Array.from({length:12}, (_,i)=> (
                <option key={i+1} value={i+1} className="text-black">
                  {new Date(0, i).toLocaleString('id-ID', {month:'long'})}
                </option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-white text-xs font-black outline-none cursor-pointer p-2"
            >
              <option value={2026} className="text-black">2026</option>
              <option value={2025} className="text-black">2025</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[100rem] mx-auto">
        <div className="overflow-x-auto border-4 border-slate-100 rounded-[2rem] shadow-2xl bg-white">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50">
                <th rowSpan={2} className="border border-slate-200 p-4 min-w-[200px] text-left uppercase font-black italic text-slate-400">
                  Item Pekerjaan ({location?.type})
                </th>
                <th colSpan={daysInMonth} className="border border-slate-200 p-2 text-center uppercase font-black tracking-[0.4em] bg-[#001f3f] text-white">
                  Tanggal ({new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear})
                </th>
              </tr>
              <tr className="bg-slate-100">
                {dateArray.map(day => (
                  <th key={day} className={`border border-slate-200 p-2 text-center font-black min-w-[35px] ${isWeekend(day) ? 'bg-red-500 text-white' : 'text-slate-600'}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="p-20 text-center font-black text-slate-300 uppercase italic text-lg tracking-widest">
                    Tidak ada template untuk kategori {location?.type}
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="group hover:bg-blue-50/50 transition-all">
                    <td className="border border-slate-100 p-3 font-black uppercase italic text-slate-700 bg-slate-50/50 sticky left-0 z-10 group-hover:text-blue-600">
                      {task.task_name}
                    </td>
                    {dateArray.map(day => {
                      const status = getCheckStatus(task.id, day);
                      const weekend = isWeekend(day);
                      return (
                        <td key={day} className={`border border-slate-100 text-center p-0 h-12 transition-all ${weekend ? 'bg-red-50/30' : ''}`}>
                          {status === 'checked' ? (
                            <div className="flex items-center justify-center">
                               <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black shadow-sm">✓</div>
                            </div>
                          ) : status === 'unchecked' ? (
                            <span className="text-red-300 font-bold opacity-30">x</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              <tr className="bg-slate-50 font-black text-slate-400">
                <td className="border border-slate-200 p-3 uppercase italic text-left">Waktu Ceklist</td>
                {dateArray.map(day => {
                   const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
                   return (
                     <td key={day} className="border border-slate-200 p-1 text-center text-[8px]">
                       {logAtDay ? (
                         <span className="text-blue-600 font-bold">
                           {new Date(logAtDay.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                         </span>
                       ) : '-'}
                     </td>
                   )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-8 items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-md shadow-lg shadow-red-200"></div>
              <span className="text-[10px] font-black uppercase italic text-slate-500">Libur (Sabtu/Minggu)</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black text-xs">✓</div>
              <span className="text-[10px] font-black uppercase italic text-slate-500">Pekerjaan Selesai</span>
           </div>
           <p className="text-[10px] font-bold text-slate-400 ml-auto uppercase tracking-widest italic">KPPN Lhokseumawe • 2026</p>
        </div>
      </div>
    </div>
  );
}

export default function RoomMonitoringPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 uppercase tracking-widest text-xs">Memuat Matrix...</div>}>
      <RoomMonitoringContent />
    </Suspense>
  );
}