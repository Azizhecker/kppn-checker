'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, Calendar, AlertCircle, Info, ChevronLeft, ChevronRight 
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

  // Generate daftar tanggal dalam bulan terpilih
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (locId) fetchData();
  }, [locId, selectedMonth, selectedYear]);

  async function fetchData() {
    setLoading(true);
    
    // 1. Ambil Nama Lokasi
    const { data: locData } = await supabase.from('locations').select('*').eq('id', locId).single();
    setLocation(locData);

    // 2. Ambil Daftar Master Task (untuk baris kiri)
    const { data: taskData } = await supabase.from('task_templates').select('*').order('id');
    setTasks(taskData || []);

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

  // Fungsi helper untuk mengecek apakah tanggal tersebut hari libur (Sabtu/Minggu)
  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Minggu, 6 = Sabtu
  };

  // Fungsi helper untuk mengecek status checklist per task dan per tanggal
  const getCheckStatus = (taskId: number, day: number) => {
    // Cari log yang sesuai dengan tanggal ini
    const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
    if (!logAtDay) return null;

    // Cari item dalam log tersebut yang sesuai dengan taskId
    const item = logAtDay.checklist_items?.find((i: any) => i.task_id === taskId);
    return item?.is_completed ? 'checked' : 'unchecked';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 text-xs">MENYIAPKAN MATRIX MONITORING...</div>;
  
  if (!location) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-10">
      <AlertCircle size={64} className="text-red-500 mb-4"/>
      <h1 className="text-2xl font-black uppercase italic">Ruangan Tidak Terdaftar</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div className="bg-[#001f3f] text-white p-6 shadow-xl">
        <div className="max-w-[100rem] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <MapPin className="text-blue-400" size={24}/>
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter">{location.name}</h1>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-[0.2em]">Matrix Pengawasan Pemeliharaan</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white text-xs font-black outline-none cursor-pointer uppercase"
            >
              {Array.from({length:12}, (_,i)=> (
                <option key={i+1} value={i+1} className="text-black">{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
            >
              <option value={2025} className="text-black">2025</option>
              <option value={2026} className="text-black">2026</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-[100rem] mx-auto">
        <div className="overflow-x-auto border-2 border-slate-200 rounded-lg shadow-sm">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              {/* Baris Tanggal */}
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border-2 border-slate-200 p-2 min-w-[150px] text-center uppercase font-black">Item Pekerjaan</th>
                <th colSpan={daysInMonth} className="border-2 border-slate-200 p-1 text-center uppercase font-black tracking-[0.3em] bg-slate-200">
                  Tanggal ({new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear})
                </th>
              </tr>
              <tr className="bg-slate-50">
                {dateArray.map(day => (
                  <th key={day} className={`border border-slate-200 p-1 text-center font-bold min-w-[30px] ${isWeekend(day) ? 'bg-red-500 text-white' : ''}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-blue-50 transition-colors">
                  <td className="border border-slate-200 p-2 font-black uppercase text-slate-700 bg-slate-50">
                    {task.task_name}
                  </td>
                  {dateArray.map(day => {
                    const status = getCheckStatus(task.id, day);
                    const weekend = isWeekend(day);
                    
                    return (
                      <td 
                        key={day} 
                        className={`border border-slate-200 text-center p-0 h-10 ${weekend ? 'bg-red-50' : ''}`}
                      >
                        {status === 'checked' && <span className="text-green-600 font-black text-lg">✓</span>}
                        {status === 'unchecked' && <span className="text-red-400 font-bold">x</span>}
                        {weekend && !status && <div className="w-full h-full bg-red-100/50"></div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Baris Jam (Opsional: Mengambil jam rata-rata atau jam pertama log hari itu) */}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-200 p-2 uppercase italic">Jam Cek</td>
                {dateArray.map(day => {
                   const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
                   return (
                     <td key={day} className="border border-slate-200 p-1 text-center text-[8px] rotate-[-45deg] sm:rotate-0">
                       {logAtDay ? new Date(logAtDay.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                     </td>
                   )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* LEGENDA */}
        <div className="mt-6 flex gap-6 items-center border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-[10px] font-black uppercase italic">Sabtu & Minggu (Libur)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-black text-sm">✓</span>
            <span className="text-[10px] font-black uppercase italic">Selesai Dikerjakan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-black text-sm">x</span>
            <span className="text-[10px] font-black uppercase italic">Tidak Dikerjakan / Belum</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-12 p-8 text-center border-t border-slate-100">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.5em]">Digital Hygiene Monitoring System • KPPN Lhokseumawe</p>
      </div>
    </div>
  );
}

export default function RoomMonitoringPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600">LOADING MATRIX...</div>}>
      <RoomMonitoringContent />
    </Suspense>
  );
}