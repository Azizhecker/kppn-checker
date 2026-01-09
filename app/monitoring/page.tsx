'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Check, 
  X, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  Clock, 
  User, 
  ShieldCheck,
  Search
} from 'lucide-react';

export default function PublicMonitoringPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMonthly, setIsMonthly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [date, isMonthly]);

  async function fetchData() {
    const { data: templates } = await supabase.from('task_templates').select('task_name');
    if (templates) setAllTasks(templates.map(t => t.task_name));

    let startDate, endDate;
    if (!isMonthly) {
      startDate = `${date}T00:00:00`;
      endDate = `${date}T23:59:59`;
    } else {
      const [year, month] = date.split('-');
      startDate = `${year}-${month}-01T00:00:00`;
      endDate = `${year}-${month}-31T23:59:59`;
    }

    const { data: logsData } = await supabase
      .from('checklist_logs')
      .select(`
        *,
        locations(name),
        checklist_items(is_completed, task_templates(task_name))
      `)
      .eq('status', 'Disetujui')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    setLogs(logsData || []);
  }

  const filteredLogs = logs.filter(log => 
    log.locations?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans">
      {/* HEADER SECTION - PREMIUM DESIGN */}
      <div className="bg-[#003366] text-white pt-12 pb-24 px-6 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
        {/* Dekorasi Background Bulatan Halus */}
        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-5%] w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Branding */}
            <div className="flex items-center gap-5">
              <div className="bg-white/15 p-4 rounded-[1.5rem] backdrop-blur-xl border border-white/20 shadow-inner">
                <ClipboardCheck size={32} className="text-blue-200" />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                  Monitoring <span className="text-blue-300">Kebersihan</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck size={14} className="text-green-400" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 opacity-80">
                    KPPN Lhokseumawe • Digital Report
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls - Glassmorphism style */}
            <div className="flex flex-wrap items-center justify-center gap-3 bg-black/20 p-2 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-lg">
              <div className="flex bg-white/10 rounded-full p-1 border border-white/5">
                <button 
                  onClick={() => setIsMonthly(false)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black transition-all duration-300 ${!isMonthly ? 'bg-white text-[#003366] shadow-md' : 'text-white hover:bg-white/5'}`}
                >HARIAN</button>
                <button 
                  onClick={() => setIsMonthly(true)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black transition-all duration-300 ${isMonthly ? 'bg-white text-[#003366] shadow-md' : 'text-white hover:bg-white/5'}`}
                >BULANAN</button>
              </div>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/5">
                <Calendar size={14} className="text-blue-200" />
                <input 
                  type={isMonthly ? "month" : "date"} 
                  value={isMonthly ? date.substring(0, 7) : date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer uppercase"
                />
              </div>
            </div>
          </div>

          {/* Search Bar - Floating */}
          <div className="max-w-2xl mx-auto mt-12 transform translate-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Cari lokasi atau ruangan tertentu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-slate-800 pl-14 pr-6 py-5 rounded-[2rem] font-bold text-sm outline-none shadow-2xl border border-transparent focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4">
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] border-b border-slate-100">
                  <th className="p-7 sticky left-0 bg-slate-50 z-20 min-w-[220px]">Detail Laporan</th>
                  <th className="p-7 min-w-[150px]"><div className="flex items-center gap-2"><User size={14}/> Petugas</div></th>
                  {allTasks.map(task => (
                    <th key={task} className="p-7 border-l border-slate-100 text-center min-w-[120px] leading-tight">
                      {task}
                    </th>
                  ))}
                  <th className="p-7 border-l border-slate-100 min-w-[220px]">Uraian / Catatan</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={allTasks.length + 3} className="p-32 text-center">
                       <div className="flex flex-col items-center opacity-30">
                          <div className="bg-slate-100 p-6 rounded-full mb-4">
                            <Search size={48} className="text-slate-400" />
                          </div>
                          <p className="font-black uppercase italic tracking-widest text-slate-500">Data Pelaporan Kosong</p>
                       </div>
                    </td>
                  </tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50 group">
                    {/* Lokasi & Waktu */}
                    <td className="p-7 sticky left-0 bg-white z-10 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.03)] border-r border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <div className="font-black text-slate-800 uppercase text-sm leading-none tracking-tighter">{log.locations?.name}</div>
                          <div className="flex items-center gap-2 mt-2 text-blue-500 font-bold text-[10px]">
                             <Clock size={10} /> 
                             {new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB 
                             {isMonthly && <span className="text-slate-300 font-medium ml-1">| {new Date(log.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Petugas */}
                    <td className="p-7">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase italic tracking-tighter">
                         {log.worker_name}
                      </div>
                    </td>

                    {/* Checklist */}
                    {allTasks.map(taskName => {
                      const item = log.checklist_items?.find((i: any) => i.task_templates?.task_name === taskName);
                      return (
                        <td key={taskName} className="p-7 text-center border-l border-slate-50/50">
                          {item ? (
                            item.is_completed ? (
                              <div className="w-9 h-9 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-green-100 transition-transform group-hover:scale-110">
                                <Check size={18} strokeWidth={4}/>
                              </div>
                            ) : (
                              <div className="w-9 h-9 bg-red-50 text-red-200 rounded-2xl flex items-center justify-center mx-auto">
                                <X size={16} strokeWidth={3}/>
                              </div>
                            )
                          ) : (
                            <span className="text-slate-200 font-black">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Notes */}
                    <td className="p-7 border-l border-slate-50/50">
                       <div className={`p-4 rounded-[1.25rem] text-[11px] font-bold leading-relaxed shadow-sm ${log.notes ? 'bg-orange-50/50 text-orange-700 border border-orange-100 italic' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'}`}>
                        {log.notes ? `"${log.notes}"` : "Kondisi Baik & Terawat"}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Decorative Footer */}
        <div className="mt-12 flex flex-col items-center">
           <div className="flex gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <div className="w-8 h-2 rounded-full bg-blue-200"></div>
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
           </div>
           <p className="text-[10px] font-reguler uppercase tracking-[0.4em] text-slate-400 text-center">
             Digitalization System • KPPN Lhokseumawe
           </p>
        </div>
      </div>
    </div>
  );
}