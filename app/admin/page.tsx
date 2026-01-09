'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { FileDown, LogOut, Check, X, ClipboardList, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMonthly, setIsMonthly] = useState(false);
  const router = useRouter();

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
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    setLogs(logsData || []);
  }

  const handleDownloadExcel = () => {
    if (logs.length === 0) return alert("Tidak ada data untuk diunduh");

    const dataUntukExcel = logs.map((log) => {
      const row: any = {
        'TANGGAL': new Date(log.created_at).toLocaleDateString('id-ID'),
        'JAM': new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        'LOKASI RUANGAN': log.locations?.name?.toUpperCase(),
        'NAMA PETUGAS': log.worker_name?.toUpperCase(),
      };

      allTasks.forEach((taskName) => {
        const item = log.checklist_items?.find((i: any) => i.task_templates?.task_name === taskName);
        if (item) {
          row[taskName] = item.is_completed ? '✔' : '✘';
        } else {
          row[taskName] = '-';
        }
      });

      row['CATATAN KERUSAKAN'] = log.notes || '-';
      row['STATUS VALIDASI'] = log.status;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);
    const workbook = XLSX.utils.book_new();

    const wscols = [
      { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 20 },
      ...allTasks.map(() => ({ wch: 18 })),
      { wch: 30 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    const fileLabel = isMonthly ? `Bulanan_${date.substring(0, 7)}` : `Harian_${date}`;
    XLSX.writeFile(workbook, `Laporan_Kebersihan_${fileLabel}.xlsx`);
  };

  const handleApprove = async (id: string) => {
    await supabase.from('checklist_logs').update({ status: 'Disetujui' }).eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-[#003366] p-5 text-white flex justify-between items-center shadow-md sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl border border-white/20"><ClipboardList size={24}/></div>
          <div>
            <h1 className="font-black text-lg leading-none uppercase tracking-tighter italic">Admin Dashboard</h1>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">KPPN Lhokseumawe Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select 
            onChange={(e) => setIsMonthly(e.target.value === 'true')}
            className="text-slate-800 p-2 rounded-lg text-[10px] font-bold outline-none border-none shadow-inner cursor-pointer"
          >
            <option value="false">HARIAN</option>
            <option value="true">BULANAN</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-slate-800 p-2 rounded-lg text-xs font-bold outline-none border-none shadow-inner"/>
          <button onClick={() => router.push('/')} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"><LogOut size={18}/></button>
        </div>
      </nav>

      <div className="p-4 md:p-8">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <div>
                <h2 className="font-black text-slate-800 text-sm uppercase italic">Data Hasil Kebersihan Ruangan</h2>
                <p className="text-[9px] font-bold text-blue-500 tracking-tight">Mode: {isMonthly ? 'Laporan Seluruh Bulan' : 'Laporan Tanggal Terpilih'}</p>
            </div>
            <button 
              onClick={handleDownloadExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-100 transition-transform active:scale-95"
            >
              <FileDown size={14}/> EXCEL
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                  <th className="p-5 border-b sticky left-0 bg-slate-100 z-10 min-w-[160px]">LOKASI / JAM</th>
                  <th className="p-5 border-b min-w-[140px]">PETUGAS</th>
                  {allTasks.map(task => (
                    <th key={task} className="p-5 border-b text-center text-[9px] border-l border-slate-200 min-w-[100px] whitespace-normal">
                      {task}
                    </th>
                  ))}
                  {/* KOLOM BARU UNTUK URAIAN */}
                  <th className="p-5 border-b min-w-[200px] border-l border-slate-200 italic">Uraian Kerusakan</th>
                  <th className="p-5 border-b text-center min-w-[100px]">STATUS</th>
                  <th className="p-5 border-b text-center min-w-[120px]">VALIDASI</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {logs.length === 0 ? (
                  <tr><td colSpan={allTasks.length + 5} className="p-20 text-center font-black text-slate-300 uppercase italic text-sm">Data Tidak Ditemukan</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                    <td className="p-5 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-sm">
                      <div className="font-black text-slate-800 uppercase leading-none">{log.locations?.name}</div>
                      <div className="text-[10px] text-blue-500 font-bold mt-1">
                        {isMonthly && <span className="mr-1">{new Date(log.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</span>}
                        {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} WIB
                      </div>
                    </td>
                    <td className="p-5 font-bold text-slate-600 uppercase italic">{log.worker_name}</td>
                    
                    {allTasks.map(taskName => {
                      const item = log.checklist_items?.find((i: any) => i.task_templates?.task_name === taskName);
                      return (
                        <td key={taskName} className="p-5 text-center border-l border-slate-50">
                          {item ? (
                            item.is_completed ? (
                              <Check className="text-green-500 mx-auto" size={18} strokeWidth={4}/>
                            ) : (
                              <X className="text-red-300 mx-auto" size={16} />
                            )
                          ) : (
                            <span className="text-slate-200 font-bold">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* MENAMPILKAN URAIAN NOTES */}
                    <td className="p-5 border-l border-slate-50">
                      {log.notes ? (
                        <div className="flex gap-2 items-start text-red-600 font-bold leading-tight bg-red-50 p-2 rounded-lg border border-red-100">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span className="text-[10px] uppercase tracking-tight">{log.notes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-200 italic">-</span>
                      )}
                    </td>

                    <td className="p-5 text-center border-l border-slate-50">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'Disetujui' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      {log.status === 'Diserahkan' && (
                        <button onClick={() => handleApprove(log.id)} className="bg-[#003366] hover:bg-blue-900 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg shadow-blue-100 transition-all">APPROVE</button>
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