'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { FileDown, CheckCircle2, LayoutDashboard, LogOut } from 'lucide-react';

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [date, filter]);

  async function fetchData() {
    let query = supabase.from('checklist_logs').select('*, locations(name), checklist_items(is_completed, task_templates(task_name))');
    if (filter === 'daily') query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
    const { data } = await query.order('created_at', { ascending: false });
    setLogs(data || []);
  }

  const approveLog = async (id: string) => {
    await supabase.from('checklist_logs').update({ status: 'Disetujui' }).eq('id', id);
    fetchData();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map(l => ({ Tanggal: l.created_at, Lokasi: l.locations.name, Petugas: l.worker_name, Status: l.status })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, "Laporan_KPPN.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white p-6 border-b flex justify-between items-center shadow-sm">
        <h1 className="font-black text-[#003366] text-xl uppercase italic">KPPN MONITOR</h1>
        <div className="flex gap-4">
          <button onClick={exportExcel} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-xs"><FileDown size={16}/> EXCEL</button>
          <button onClick={() => window.location.href='/login'} className="text-red-500"><LogOut size={20}/></button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex gap-4 mb-8">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-3 rounded-2xl border-none shadow-sm font-bold text-slate-600 outline-none"/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logs.map(log => (
            <div key={log.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-slate-800">{log.locations.name}</h3>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${log.status === 'Disetujui' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{log.status}</span>
              </div>
              <div className="space-y-1 mb-6">
                {log.checklist_items.map((item: any, idx: number) => (
                  <div key={idx} className="text-[10px] flex items-center gap-2 font-bold text-slate-400">
                    <div className={`w-2 h-2 rounded-full ${item.is_completed ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                    {item.task_templates?.task_name}
                  </div>
                ))}
              </div>
              {log.status === 'Diserahkan' && (
                <button onClick={() => approveLog(log.id)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs">SETUJUI</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}