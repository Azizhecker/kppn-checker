'use client';
import QRCode from "react-qr-code";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Check, X, ClipboardList, LayoutDashboard, 
  MapPin, ListChecks, Trash2, LogOut, ChevronRight, 
  CheckCircle2, Download, User, CheckSquare, Tags, PlusCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'locations' | 'tasks' | 'categories'>('overview');
  const [locations, setLocations] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // STATE KATEGORI DINAMIS
  const [categories, setCategories] = useState<string[]>(['umum', 'toilet']);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [filterType, setFilterType] = useState<'daily' | 'monthly'>('daily');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  const [newLoc, setNewLoc] = useState({ id: '', name: '', type: 'umum' });
  const [newTask, setNewTask] = useState({ name: '', category: 'umum' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monitoring') fetchLogs();
  }, [activeTab, filterDate, filterMonth, filterType]);

  async function fetchData() {
    setIsLoading(true);
    const { data: locs } = await supabase.from('locations').select('*').order('name');
    const { data: tsks } = await supabase.from('task_templates').select('*').order('category');
    
    setLocations(locs || []);
    setAllTasks(tsks || []);

    // Sinkronisasi kategori dari Database
    const dbCategoriesFromTasks = tsks?.map(t => t.category.toLowerCase()) || [];
    const dbCategoriesFromLocs = locs?.map(l => l.type.toLowerCase()) || [];
    const combined = Array.from(new Set(['umum', 'toilet', ...dbCategoriesFromTasks, ...dbCategoriesFromLocs]));
    setCategories(combined);

    setIsLoading(false);
  }

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    const formattedCat = newCategoryName.toLowerCase().trim();
    if (!categories.includes(formattedCat)) {
      setCategories([...categories, formattedCat]);
      alert(`Kategori "${formattedCat}" ditambahkan sementara. Akan permanen jika digunakan pada Lokasi/Task baru.`);
      setNewCategoryName('');
    }
  };

  async function fetchLogs() {
    let query = supabase
      .from('checklist_logs')
      .select(`
        *,
        locations(name),
        checklist_items(
          is_completed, 
          task_templates(task_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (filterType === 'daily') {
      query = query.gte('created_at', `${filterDate}T00:00:00`).lte('created_at', `${filterDate}T23:59:59`);
    } else {
      const year = filterMonth.split('-')[0];
      const month = filterMonth.split('-')[1];
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      query = query.gte('created_at', `${filterMonth}-01T00:00:00`).lte('created_at', `${filterMonth}-${lastDay}T23:59:59`);
    }

    const { data } = await query;
    setLogs(data || []);
  }

  const handleApproveAll = async () => {
    const pendingLogs = logs.filter(l => l.status !== 'DISETUJUI').map(l => l.id);
    if (pendingLogs.length === 0) return alert("Semua data sudah disetujui.");
    
    if (confirm(`Setujui ${pendingLogs.length} laporan sekaligus?`)) {
      const { error } = await supabase.from('checklist_logs').update({ status: 'DISETUJUI' }).in('id', pendingLogs);
      if (!error) fetchLogs();
    }
  };

  const handleApprove = async (logId: string) => {
    const { error } = await supabase.from('checklist_logs').update({ status: 'DISETUJUI' }).eq('id', logId);
    if (!error) fetchLogs();
  };

  const exportToExcel = () => {
    const reportData = logs.map(log => ({
      'Tanggal': new Date(log.created_at).toLocaleDateString('id-ID'),
      'Lokasi': log.locations?.name,
      'Petugas': log.worker_name,
      'Pekerjaan': log.checklist_items?.map((i:any) => `${i.task_templates?.task_name}: ${i.is_completed ? 'YA' : 'TIDAK'}`).join(', '),
      'Status': log.status || 'PENDING'
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `Laporan_KPPN_${filterDate}.xlsx`);
  };

  const handleAddLocation = async () => {
    if (!newLoc.name) return alert("Nama Ruangan wajib diisi!");
    const generatedId = newLoc.id || `LOC-${Date.now().toString().slice(-4)}`;
    const { error } = await supabase.from('locations').insert([{ id: generatedId.toUpperCase(), name: newLoc.name, type: newLoc.type }]);
    if (error) alert(error.message);
    else { setNewLoc({ id: '', name: '', type: 'umum' }); fetchData(); }
  };

  const handleAddTask = async () => {
    if (!newTask.name) return alert("Nama Task wajib diisi!");
    const { error } = await supabase.from('task_templates').insert([{ task_name: newTask.name, category: newTask.category }]);
    if (error) alert(error.message);
    else { setNewTask({ name: '', category: 'umum' }); fetchData(); }
  };

  const downloadQR = (locId: string, locName: string) => {
    const svg = document.getElementById(`qr-${locId}`) as HTMLElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 300; canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 22, 40, 256, 256);
        ctx.font = "bold 20px Inter, sans-serif"; ctx.fillStyle = "#0f172a"; ctx.textAlign = "center";
        ctx.fillText(locName.toUpperCase(), canvas.width / 2, 340);
        ctx.font = "14px Inter, sans-serif"; ctx.fillStyle = "#64748b";
        ctx.fillText(locId, canvas.width / 2, 365);
      }
      const link = document.createElement("a");
      link.download = `QR_${locName}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-[#003366] text-white p-6 flex flex-col shadow-2xl z-20">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-blue-500 p-2 rounded-xl shadow-lg">
            <ClipboardList size={24} />
          </div>
          <h1 className="font-black text-xl tracking-tighter italic uppercase">Admin KPPN</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            <LayoutDashboard size={20}/> Overview
          </button>
          <button onClick={() => setActiveTab('monitoring')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'monitoring' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            <CheckCircle2 size={20}/> Data Kebersihan
          </button>
          <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'categories' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Tags size={20}/> Kelola Kategori
          </button>
          <button onClick={() => setActiveTab('locations')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'locations' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            <MapPin size={20}/> Kelola Ruangan
          </button>
          <button onClick={() => setActiveTab('tasks')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'tasks' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            <ListChecks size={20}/> Master Task
          </button>
        </nav>
        <button onClick={() => router.push('/')} className="mt-auto flex items-center gap-4 px-5 py-4 text-red-400 font-bold text-sm hover:bg-red-500/10 rounded-2xl transition-all">
          <LogOut size={20}/> Logout
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">
              {activeTab === 'overview' && "Dashboard Admin"}
              {activeTab === 'monitoring' && "Monitoring Kebersihan"}
              {activeTab === 'locations' && "Manajemen Lokasi"}
              {activeTab === 'tasks' && "Template Pekerjaan"}
              {activeTab === 'categories' && "Manajemen Kategori"}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Digital Checker KPPN Lhokseumawe</p>
          </div>

          {activeTab === 'monitoring' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                <select value={filterType} onChange={(e:any) => setFilterType(e.target.value)} className="text-[10px] font-black px-2 outline-none uppercase cursor-pointer">
                  <option value="daily">Harian</option>
                  <option value="monthly">Bulanan</option>
                </select>
                <input type={filterType === 'daily' ? "date" : "month"} value={filterType === 'daily' ? filterDate : filterMonth} onChange={(e) => filterType === 'daily' ? setFilterDate(e.target.value) : setFilterMonth(e.target.value)} className="text-xs font-black outline-none border-l pl-3 uppercase bg-transparent"/>
              </div>
              {logs.some(l => l.status !== 'DISETUJUI') && (
                <button onClick={handleApproveAll} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
                  <CheckSquare size={16}/> Approve All
                </button>
              )}
              <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100">
                <Download size={16}/> Export Excel
              </button>
            </div>
          )}
        </header>

        {/* TAB MONITORING */}
        {activeTab === 'monitoring' && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">No</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info Lokasi & Waktu</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Checklist</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Laporan Kendala</th>
                    <th className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                      <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="p-4">
                        <div className="font-black text-slate-800 uppercase text-xs">{log.locations?.name}</div>
                        <div className="flex items-center gap-1 mt-2 text-[9px] font-black text-blue-600 uppercase">
                          <User size={10}/> {log.worker_name || 'PETUGAS CS'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                          {log.checklist_items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.is_completed ? <Check size={10} className="text-green-500" strokeWidth={4}/> : <X size={10} className="text-red-500" strokeWidth={4}/>}
                              <span className="text-[9px] font-bold text-slate-600 uppercase truncate max-w-[150px]">{item.task_templates?.task_name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {log.notes ? (
                          <div className="text-[9px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 uppercase italic">{log.notes}</div>
                        ) : (
                          <span className="text-slate-300 text-[9px] font-bold uppercase italic">- Nihil -</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest ${log.status === 'DISETUJUI' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {log.status || 'PROSES'}
                          </span>
                          {log.status !== 'DISETUJUI' && (
                            <button onClick={() => handleApprove(log.id)} className="bg-[#003366] text-white px-4 py-1.5 rounded-lg font-black text-[9px] uppercase hover:scale-105 transition-all shadow-sm">Approve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB KATEGORI */}
        {activeTab === 'categories' && (
          <div className="max-w-2xl">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 mb-8">
              <h3 className="text-slate-800 font-black text-sm uppercase italic mb-6 flex items-center gap-2">
                <PlusCircle size={18} className="text-orange-500"/> Tambah Kategori Baru
              </h3>
              <div className="flex gap-3">
                <input 
                  placeholder="Nama Kategori (Contoh: Aula, Musholla...)" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-orange-400 transition-all"
                />
                <button onClick={handleAddCategory} className="bg-orange-500 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 hover:bg-orange-600">Simpan</button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase italic">* Kategori akan tersimpan permanen di database setelah digunakan pada Ruangan atau Task.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(cat => (
                <div key={cat} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                  <span className="font-black text-slate-700 uppercase tracking-wider text-xs">{cat}</span>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB LOCATIONS */}
        {activeTab === 'locations' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit">
              <h3 className="text-slate-800 font-black text-sm uppercase italic mb-6 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500"/> Ruangan Baru
              </h3>
              <div className="space-y-4">
                <input placeholder="ID (Manual/Otomatis)" value={newLoc.id} onChange={e=>setNewLoc({...newLoc, id: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-blue-500 transition-all"/>
                <input placeholder="Nama Ruangan" value={newLoc.name} onChange={e=>setNewLoc({...newLoc, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-blue-500 transition-all"/>
                <select value={newLoc.type} onChange={e=>setNewLoc({...newLoc, type: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none uppercase cursor-pointer">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button onClick={handleAddLocation} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">Simpan Ruangan</button>
              </div>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map(loc => (
                <div key={loc.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex justify-between items-start group hover:border-blue-200 transition-all relative">
                  <div className="flex-1">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase italic">{loc.type}</span>
                    <h4 className="text-lg font-black text-slate-800 uppercase italic mt-2 flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/monitoring?loc=${loc.id}`)}>{loc.name} <ChevronRight size={14}/></h4>
                    <button onClick={() => downloadQR(loc.id, loc.name)} className="mt-4 flex items-center gap-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 px-4 py-2 rounded-xl transition-all"><Download size={14}/><span className="text-[10px] font-black uppercase">Cetak QR</span></button>
                  </div>
                  <button onClick={() => { if(confirm('Hapus?')) supabase.from('locations').delete().eq('id', loc.id).then(() => fetchData()) }} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                  <div className="hidden"><QRCode id={`qr-${loc.id}`} value={`${typeof window !== 'undefined' ? window.location.origin : ''}/monitoring?loc=${loc.id}`} size={256}/></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-6 rounded-[2rem]">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase mb-2 block">Pekerjaan</label>
                      <input placeholder="Contoh: Pel Lantai..." value={newTask.name} onChange={e=>setNewTask({...newTask, name: e.target.value})} className="w-full bg-white p-4 rounded-2xl text-sm font-bold outline-none shadow-sm focus:ring-2 ring-blue-500"/>
                    </div>
                    <div className="w-full md:w-64">
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase mb-2 block">Kategori</label>
                      <select value={newTask.category} onChange={e=>setNewTask({...newTask, category: e.target.value})} className="w-full bg-white p-4 rounded-2xl text-sm font-bold outline-none uppercase cursor-pointer">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <button onClick={handleAddTask} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-black transition-all">Tambah</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[450px] overflow-y-auto pr-2">
              {allTasks.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-blue-400"></div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-700">{t.task_name}</h5>
                      <p className="text-[9px] font-black text-blue-500 uppercase italic">{t.category}</p>
                    </div>
                  </div>
                  <button onClick={() => { if(confirm('Hapus?')) supabase.from('task_templates').delete().eq('id', t.id).then(() => fetchData()) }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total Ruangan</p>
              <h3 className="text-5xl font-black text-slate-800 italic">{locations.length}</h3>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Master Task</p>
              <h3 className="text-5xl font-black text-indigo-600 italic">{allTasks.length}</h3>
            </div>
            <div className="bg-[#003366] p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
              <h3 className="text-2xl font-black italic uppercase leading-tight">Database Connected</h3>
              <div className="mt-4 flex items-center gap-2 text-green-400 text-xs font-bold uppercase"><CheckCircle2 size={16}/> System Live (2026)</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}