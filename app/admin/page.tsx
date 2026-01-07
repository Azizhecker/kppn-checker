'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { FileDown, LogOut, Check, X, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [date]);

  async function fetchData() {
    const { data: logsData } = await supabase
      .from('checklist_logs')
      .select(`
        *,
        locations(name),
        checklist_items(
          is_completed,
          task_templates(task_name)
        )
      `)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false });
    
    // Identifikasi semua jenis tugas yang ada secara dinamis
    const taskNames = new Set<string>();
    logsData?.forEach(log => {
      log.checklist_items?.forEach((item: any) => {
        if (item.task_templates) taskNames.add(item.task_templates.task_name);
      });
    });

    setAllTasks(Array.from(taskNames));
    setLogs(logsData || []);
  }

  const handleApprove = async (id: string) => {
    await supabase.from('checklist_logs').update({ status: 'Disetujui' }).eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER NAV */}
      <nav className="bg-[#003366] p-5 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl border border-white/20"><ClipboardList size={24}/></div>
          <div>
            <h1 className="font-black text-lg leading-none uppercase tracking-tighter italic">Admin Dashboard</h1>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">KPPN Lhokseumawe Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="date" value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="text-slate-800 p-2 rounded-lg text-xs font-bold outline-none border-none shadow-inner"
          />
          <button onClick={() => router.push('/')} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors">
            <LogOut size={18}/>
          </button>
        </div>
      </nav>

      {/* TABEL AREA */}
      <div className="p-4 md:p-8">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-800 text-sm uppercase italic">Data Hasil Kebersihan Ruangan</h2>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-100">
              <FileDown size={14}/> EXCEL
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                  <th className="p-5 border-b sticky left-0 bg-slate-100 z-10">LOKASI / JAM</th>
                  <th className="p-5 border-b">PETUGAS</th>
                  {allTasks.map(task => (
                    <th key={task} className="p-5 border-b text-center text-[9px] border-l border-slate-200">{task}</th>
                  ))}
                  <th className="p-5 border-b text-center">STATUS</th>
                  <th className="p-5 border-b text-center">VALIDASI</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {logs.length === 0 ? (
                  <tr><td colSpan={allTasks.length + 4} className="p-20 text-center font-black text-slate-300 uppercase italic text-sm">Data Kosong</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                    <td className="p-5 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-sm">
                      <div className="font-black text-slate-800 uppercase">{log.locations?.name}</div>
                      <div className="text-[10px] text-blue-500 font-bold">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} WIB</div>
                    </td>
                    <td className="p-5 font-bold text-slate-600 uppercase italic">{log.worker_name}</td>
                    
                    {allTasks.map(taskName => {
                      const item = log.checklist_items.find((i: any) => i.task_templates?.task_name === taskName);
                      return (
                        <td key={taskName} className="p-5 text-center border-l border-slate-50">
                          {item?.is_completed ? (
                            <Check className="text-green-500 mx-auto" size={18} strokeWidth={4}/>
                          ) : (
                            <X className="text-red-200 mx-auto" size={16} />
                          )}
                        </td>
                      );
                    })}

                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'Disetujui' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      {log.status === 'Diserahkan' && (
                        <button onClick={() => handleApprove(log.id)} className="bg-[#003366] text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg shadow-blue-100">APPROVE</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}